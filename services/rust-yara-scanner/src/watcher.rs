use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, Event, EventKind};
use std::path::Path;
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{info, error, warn};
use std::time::Duration;

pub async fn start_watcher(
    path: String,
    tx: mpsc::Sender<String>,
) -> anyhow::Result<()> {
    let (notify_tx, notify_rx) = std::sync::mpsc::channel();

    let mut watcher = RecommendedWatcher::new(notify_tx, Config::default())?;
    
    info!("Watching directory: {}", path);
    watcher.watch(Path::new(&path), RecursiveMode::Recursive)?;

    // Process events in a blocking loop (notify is blocking)
    // We run this in a separate blocking task
    tokio::task::spawn_blocking(move || {
        loop {
            match notify_rx.recv() {
                Ok(Ok(event)) => {
                    match event.kind {
                        EventKind::Create(_) | EventKind::Modify(_) => {
                            for path in event.paths {
                                if path.is_file() {
                                    let path_str = path.to_string_lossy().to_string();
                                    if let Err(e) = tx.blocking_send(path_str) {
                                        error!("Failed to send file path to channel: {}", e);
                                        return;
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                }
                Ok(Err(e)) => error!("Watch error: {:?}", e),
                Err(e) => {
                    error!("Channel error: {:?}", e);
                    break;
                }
            }
        }
    });

    Ok(())
}
