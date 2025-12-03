use std::collections::HashSet;
use std::sync::RwLock;
use ndr_telemetry::{info, error};

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
        match self.iocs.write() {
            Ok(mut iocs) => {
                if iocs.insert(ioc.clone()) {
                    info!("Added IOC: {}", ioc);
                }
            }
            Err(e) => {
                error!("IOC store lock poisoned during add: {}", e);
                // Recover from poisoned lock
                let mut iocs = e.into_inner();
                if iocs.insert(ioc.clone()) {
                    info!("Added IOC (recovered from poison): {}", ioc);
                }
            }
        }
    }

    pub fn remove_ioc(&self, ioc: &str) {
        match self.iocs.write() {
            Ok(mut iocs) => {
                if iocs.remove(ioc) {
                    info!("Removed IOC: {}", ioc);
                }
            }
            Err(e) => {
                error!("IOC store lock poisoned during remove: {}", e);
                let mut iocs = e.into_inner();
                if iocs.remove(ioc) {
                    info!("Removed IOC (recovered from poison): {}", ioc);
                }
            }
        }
    }

    pub fn contains(&self, value: &str) -> bool {
        match self.iocs.read() {
            Ok(iocs) => iocs.contains(value),
            Err(e) => {
                error!("IOC store lock poisoned during contains check: {}", e);
                // Recover from poisoned lock
                let iocs = e.into_inner();
                iocs.contains(value)
            }
        }
    }

    pub fn count(&self) -> usize {
        match self.iocs.read() {
            Ok(iocs) => iocs.len(),
            Err(e) => {
                error!("IOC store lock poisoned during count: {}", e);
                let iocs = e.into_inner();
                iocs.len()
            }
        }
    }
}
