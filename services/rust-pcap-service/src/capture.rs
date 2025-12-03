use pcap::{Capture, Device};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use ndr_telemetry::{info, warn, error};
use anyhow::{Result, Context};
use chrono::Local;

pub fn start_capture(interface_name: &str, output_dir: &str) -> Result<()> {
    info!("Initializing capture on interface: {}", interface_name);

    // Find device
    let device = if interface_name == "any" {
        Device::lookup()?.context("No default device found")?
    } else {
        Device::list()?
            .into_iter()
            .find(|d| d.name == interface_name)
            .ok_or_else(|| anyhow::anyhow!("Device {} not found", interface_name))?
    };

    info!("Capturing on device: {:?}", device);

    let mut cap = Capture::from_device(device)?
        .promisc(true)
        .snaplen(65535)
        .timeout(1000)
        .open()?;

    // Rotation config
    let rotation_interval = 300; // 5 minutes
    let mut last_rotation = SystemTime::now();
    let mut current_savefile = create_savefile(&mut cap, output_dir)?;

    loop {
        match cap.next_packet() {
            Ok(packet) => {
                current_savefile.write(&packet);
            }
            Err(pcap::Error::TimeoutExpired) => {
                // Continue, check rotation
            }
            Err(e) => {
                warn!("Packet capture error: {}", e);
            }
        }

        // Check rotation
        if let Ok(elapsed) = last_rotation.elapsed() {
            if elapsed.as_secs() >= rotation_interval {
                info!("Rotating PCAP file...");
                current_savefile = create_savefile(&mut cap, output_dir)?;
                last_rotation = SystemTime::now();
            }
        }
    }
}

fn create_savefile(cap: &mut Capture<pcap::Active>, output_dir: &str) -> Result<pcap::Savefile> {
    let timestamp = Local::now().format("%Y%m%d-%H%M%S");
    let filename = format!("{}/capture-{}.pcap", output_dir, timestamp);
    let path = Path::new(&filename);
    
    info!("Creating new PCAP file: {}", filename);
    let savefile = cap.savefile(path)?;
    Ok(savefile)
}
