use pcap::{Device, Capture, Savefile};
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use std::env;
use std::path::Path;
use std::fs;
use rdkafka::config::ClientConfig;
use rdkafka::producer::{FutureProducer, FutureRecord};
use std::time::{Duration, SystemTime};
use uuid::Uuid;
use anyhow::{Result, Context};

#[derive(Serialize, Deserialize, Debug)]
struct PacketMetadata {
    timestamp: DateTime<Utc>,
    len: u32,
    src_mac: String,
    dst_mac: String,
    protocol: String,
}

struct PcapRotator {
    current_savefile: Option<Savefile>,
    current_file_path: String,
    file_start_time: SystemTime,
    pcap_dir: String,
    rotation_interval: Duration,
}

impl PcapRotator {
    fn new(pcap_dir: &str, rotation_interval_secs: u64) -> Self {
        fs::create_dir_all(pcap_dir).expect("Failed to create pcap directory");
        PcapRotator {
            current_savefile: None,
            current_file_path: String::new(),
            file_start_time: SystemTime::now(),
            pcap_dir: pcap_dir.to_string(),
            rotation_interval: Duration::from_secs(rotation_interval_secs),
        }
    }

    fn rotate_if_needed(&mut self, capture: &Capture<pcap::Active>) -> Result<()> {
        let now = SystemTime::now();
        let should_rotate = self.current_savefile.is_none() || 
                           now.duration_since(self.file_start_time).unwrap_or(Duration::ZERO) >= self.rotation_interval;

        if should_rotate {
            if let Some(_) = self.current_savefile.take() {
                println!("Rotated pcap file: {}", self.current_file_path);
            }

            let timestamp = Utc::now().format("%Y-%m-%d_%H-%M-%S");
            let filename = format!("capture-{}-{}.pcap", timestamp, Uuid::new_v4());
            let file_path = Path::new(&self.pcap_dir).join(&filename);
            self.current_file_path = file_path.to_string_lossy().to_string();
            
            self.current_savefile = Some(capture.savefile(&self.current_file_path)?);
            self.file_start_time = now;
            println!("Started new pcap file: {}", self.current_file_path);
        }
        Ok(())
    }

    fn write(&mut self, packet: &pcap::Packet) {
        if let Some(sf) = &mut self.current_savefile {
            sf.write(packet);
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();
    println!("Starting Rust High-Performance Sensor (Kafka + PCAP)...");

    // Configuration
    let kafka_brokers = env::var("KAFKA_BROKERS").unwrap_or_else(|_| "kafka:9092".to_string());
    let kafka_topic = "network-events";
    let pcap_dir = env::var("PCAP_DIR").unwrap_or_else(|_| "/var/lib/pcap".to_string());
    let rotation_secs = env::var("PCAP_ROTATION_SECONDS")
        .unwrap_or_else(|_| "3600".to_string())
        .parse::<u64>()
        .unwrap_or(3600);

    println!("Connecting to Kafka at: {}", kafka_brokers);
    println!("PCAP Directory: {}, Rotation: {}s", pcap_dir, rotation_secs);

    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", &kafka_brokers)
        .set("message.timeout.ms", "5000")
        .create()
        .expect("Producer creation error");

    // Find device
    let device_name = env::var("INTERFACE").unwrap_or_else(|_| "eth0".to_string());
    let device = Device::list()?
        .into_iter()
        .find(|d| d.name == device_name)
        .or_else(|| Device::lookup().ok().flatten())
        .context("No suitable network device found")?;
    
    println!("Capturing on device: {:?}", device.name);

    let mut cap = Capture::from_device(device)?
        .promisc(true)
        .snaplen(65535)
        .timeout(1000)
        .open()?;

    let mut rotator = PcapRotator::new(&pcap_dir, rotation_secs);

    println!("Capture started. Streaming to topic: {}", kafka_topic);

    loop {
        // Check rotation
        if let Err(e) = rotator.rotate_if_needed(&cap) {
            eprintln!("Error rotating pcap: {:?}", e);
        }

        match cap.next_packet() {
            Ok(packet) => {
                // 1. Write to PCAP
                rotator.write(&packet);

                // 2. Extract Metadata for Kafka
                let ts = Utc::now();
                let len = packet.header.len;
                let data = packet.data;

                if data.len() >= 14 {
                    let dst_mac = format!("{:02x}:{:02x}:{:02x}:{:02x}:{:02x}:{:02x}", 
                        data[0], data[1], data[2], data[3], data[4], data[5]);
                    let src_mac = format!("{:02x}:{:02x}:{:02x}:{:02x}:{:02x}:{:02x}", 
                        data[6], data[7], data[8], data[9], data[10], data[11]);
                    
                    let ether_type = ((data[12] as u16) << 8) | (data[13] as u16);
                    let protocol = match ether_type {
                        0x0800 => "IPv4",
                        0x86DD => "IPv6",
                        0x0806 => "ARP",
                        _ => "Other",
                    };

                    let metadata = PacketMetadata {
                        timestamp: ts,
                        len,
                        src_mac,
                        dst_mac,
                        protocol: protocol.to_string(),
                    };

                    if let Ok(json) = serde_json::to_string(&metadata) {
                        let _ = producer.send(
                            FutureRecord::to(kafka_topic)
                                .payload(&json)
                                .key("sensor-1"),
                            Duration::from_secs(0),
                        );
                    }
                }
            },
            Err(pcap::Error::TimeoutExpired) => {
                continue;
            },
            Err(e) => {
                eprintln!("Error capturing packet: {:?}", e);
            }
        }
    }
}
