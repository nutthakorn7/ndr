use axum::{
    extract::State,
    Json,
};
use std::sync::Arc;
use crate::AppState;
use serde::Serialize;
use std::fs;

#[derive(Serialize)]
pub struct PcapFile {
    name: String,
    size: u64,
    created: String,
}

pub async fn list_pcaps(State(state): State<Arc<AppState>>) -> Json<Vec<PcapFile>> {
    let mut files = Vec::new();

    if let Ok(entries) = fs::read_dir(&state.pcap_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.ends_with(".pcap") {
                        let created = metadata.created()
                            .unwrap_or(std::time::SystemTime::now())
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs()
                            .to_string();

                        files.push(PcapFile {
                            name,
                            size: metadata.len(),
                            created,
                        });
                    }
                }
            }
        }
    }

    // Sort by name (timestamp) descending
    files.sort_by(|a, b| b.name.cmp(&a.name));

    Json(files)
}
