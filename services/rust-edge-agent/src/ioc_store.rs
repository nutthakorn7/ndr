use std::collections::HashSet;
use std::sync::RwLock;
use ndr_telemetry::info;

pub struct IocStore {
    iocs: RwLock<HashSet<String>>,
}

impl IocStore {
    pub fn new() -> Self {
        Self {
            iocs: RwLock::new(HashSet::new()),
        }
    }

    pub fn add_ioc(&self, ioc: String) {
        let mut iocs = self.iocs.write().unwrap();
        if iocs.insert(ioc.clone()) {
            info!("Added IOC: {}", ioc);
        }
    }

    pub fn remove_ioc(&self, ioc: &str) {
        let mut iocs = self.iocs.write().unwrap();
        if iocs.remove(ioc) {
            info!("Removed IOC: {}", ioc);
        }
    }

    pub fn contains(&self, value: &str) -> bool {
        let iocs = self.iocs.read().unwrap();
        iocs.contains(value)
    }

    pub fn count(&self) -> usize {
        let iocs = self.iocs.read().unwrap();
        iocs.len()
    }
}
