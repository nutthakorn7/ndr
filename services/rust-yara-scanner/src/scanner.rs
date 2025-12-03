use yara::{Compiler, Rules};
use std::path::Path;
use anyhow::{Result, Context};
use ndr_telemetry::{info, warn, error};
use serde::{Serialize, Deserialize};
use sha2::{Sha256, Digest};
use std::fs::File;
use std::io::Read;

#[derive(Debug, Serialize, Clone)]
pub struct ScanResult {
    pub file_path: String,
    pub matches: Vec<Match>,
    pub file_hash: String,
    pub file_size: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct Match {
    pub rule: String,
    pub namespace: String,
    pub tags: Vec<String>,
    pub meta: serde_json::Value,
}

pub struct Scanner {
    rules: Rules,
}

impl Scanner {
    pub fn new(rules_path: &str) -> Result<Self> {
        let mut compiler = Compiler::new()?;
        
        info!("Loading YARA rules from {}", rules_path);
        
        let mut count = 0;
        for entry in walkdir::WalkDir::new(rules_path) {
            let entry = entry?;
            let path = entry.path();
            
            if path.extension().map_or(false, |ext| ext == "yar" || ext == "yara") {
                match compiler.add_rules_file(path) {
                    Ok(_) => {
                        count += 1;
                    }
                    Err(e) => warn!("Failed to compile rule {}: {}", path.display(), e),
                }
            }
        }
        
        if count == 0 {
            warn!("No YARA rules loaded!");
        } else {
            info!("Loaded {} YARA rule files", count);
        }

        let rules = compiler.compile_rules().context("Failed to compile rules")?;
        
        Ok(Self { rules })
    }

    pub fn scan_file(&self, path: &Path) -> Result<Option<ScanResult>> {
        if !path.exists() {
            return Ok(None);
        }

        let matches = self.rules.scan_file(path, 10)?;
        
        if matches.is_empty() {
            return Ok(None);
        }

        let file_size = path.metadata()?.len();
        let file_hash = self.calculate_hash(path)?;

        let scan_matches: Vec<Match> = matches.iter().map(|m| {
            // Convert meta to JSON value
            let meta_map: serde_json::Map<String, serde_json::Value> = m.metas.iter()
                .map(|meta| {
                    let value = match &meta.value {
                        yara::MetadataValue::Integer(i) => serde_json::Value::Number((*i).into()),
                        yara::MetadataValue::String(s) => serde_json::Value::String(s.to_string()),
                        yara::MetadataValue::Boolean(b) => serde_json::Value::Bool(*b),
                    };
                    (meta.identifier.to_string(), value)
                })
                .collect();

            Match {
                rule: m.identifier.to_string(),
                namespace: m.namespace.to_string(),
                tags: m.tags.iter().map(|t| t.to_string()).collect(),
                meta: serde_json::Value::Object(meta_map),
            }
        }).collect();

        Ok(Some(ScanResult {
            file_path: path.to_string_lossy().to_string(),
            matches: scan_matches,
            file_hash,
            file_size,
        }))
    }

    fn calculate_hash(&self, path: &Path) -> Result<String> {
        let mut file = File::open(path)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0; 4096];

        loop {
            let count = file.read(&mut buffer)?;
            if count == 0 {
                break;
            }
            hasher.update(&buffer[..count]);
        }

        Ok(hex::encode(hasher.finalize()))
    }
}
