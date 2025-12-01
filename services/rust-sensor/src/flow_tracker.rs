use chrono::{DateTime, Utc};
use hashbrown::HashMap;
use serde::{Serialize, Deserialize};
use std::net::IpAddr;
use std::time::Duration;

#[derive(Debug, Clone, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub struct FiveTuple {
    pub src_ip: IpAddr,
    pub dst_ip: IpAddr,
    pub src_port: u16,
    pub dst_port: u16,
    pub protocol: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Flow {
    pub five_tuple: FiveTuple,
    pub start_time: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub packet_count: u64,
    pub byte_count: u64,
    pub tcp_flags: u8,
    pub state: FlowState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FlowState {
    Active,
    Closed,
    Timed

Out,
}

impl Flow {
    pub fn new(five_tuple: FiveTuple) -> Self {
        let now = Utc::now();
        Flow {
            five_tuple,
            start_time: now,
            last_seen: now,
            packet_count: 0,
            byte_count: 0,
            tcp_flags: 0,
            state: FlowState::Active,
        }
    }

    pub fn update(&mut self, packet_len: u64, tcp_flags: u8) {
        self.last_seen = Utc::now();
        self.packet_count += 1;
        self.byte_count += packet_len;
        self.tcp_flags |= tcp_flags;

        // Check for FIN or RST
        if (tcp_flags & 0x01) != 0 || (tcp_flags & 0x04) != 0 {
            self.state = FlowState::Closed;
        }
    }

    pub fn duration(&self) -> Duration {
        self.last_seen
            .signed_duration_since(self.start_time)
            .to_std()
            .unwrap_or(Duration::ZERO)
    }

    pub fn packets_per_second(&self) -> f64 {
        let dur = self.duration().as_secs_f64();
        if dur > 0.0 {
            self.packet_count as f64 / dur
        } else {
            0.0
        }
    }

    pub fn bytes_per_second(&self) -> f64 {
        let dur = self.duration().as_secs_f64();
        if dur > 0.0 {
            self.byte_count as f64 / dur
        } else {
            0.0
        }
    }
}

pub struct FlowTracker {
    flows: HashMap<FiveTuple, Flow>,
    timeout: Duration,
}

impl FlowTracker {
    pub fn new(timeout_secs: u64) -> Self {
        FlowTracker {
            flows: HashMap::new(),
            timeout: Duration::from_secs(timeout_secs),
        }
    }

    pub fn process_packet(&mut self, five_tuple: FiveTuple, packet_len: u64, tcp_flags: u8) {
        self.flows
            .entry(five_tuple.clone())
            .or_insert_with(|| Flow::new(five_tuple))
            .update(packet_len, tcp_flags);
    }

    pub fn expire_flows(&mut self) -> Vec<Flow> {
        let now = Utc::now();
        let mut expired = Vec::new();

        self.flows.retain(|_, flow| {
            let idle_time = now
                .signed_duration_since(flow.last_seen)
                .to_std()
                .unwrap_or(Duration::ZERO);

            if idle_time >= self.timeout || matches!(flow.state, FlowState::Closed) {
                let mut expired_flow = flow.clone();
                expired_flow.state = if matches!(flow.state, FlowState::Closed) {
                    FlowState::Closed
                } else {
                    FlowState::TimedOut
                };
                expired.push(expired_flow);
                false
            } else {
                true
            }
        });

        expired
    }

    pub fn active_flow_count(&self) -> usize {
        self.flows.len()
    }
}
