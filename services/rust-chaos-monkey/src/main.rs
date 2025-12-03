use clap::Parser;
use kube::{Client, Api, api::{ListParams, DeleteParams}};
use k8s_openapi::api::core::v1::Pod;
use rand::seq::SliceRandom;
use std::time::Duration;
use ndr_telemetry::{init_telemetry, info, warn, error};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Target namespace
    #[arg(short, long, default_value = "default")]
    namespace: String,

    /// Label selector to target pods (e.g., "app")
    #[arg(short, long, default_value = "app")]
    selector: String,

    /// Interval between kills in seconds
    #[arg(short, long, default_value_t = 30)]
    interval: u64,

    /// Dry run mode (don't actually delete pods)
    #[arg(long, default_value_t = false)]
    dry_run: bool,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_telemetry("chaos-monkey")?;
    
    let args = Args::parse();
    info!("🐒 Starting Chaos Monkey");
    info!("Target Namespace: {}", args.namespace);
    info!("Selector Key: {}", args.selector);
    info!("Interval: {}s", args.interval);
    if args.dry_run {
        warn!("DRY RUN MODE ENABLED - No pods will be deleted");
    }

    // Initialize Kubernetes client
    let client = Client::try_default().await.map_err(|e| {
        error!("Failed to connect to Kubernetes cluster: {}", e);
        anyhow::anyhow!("Kubernetes connection failed")
    })?;

    let pods: Api<Pod> = Api::namespaced(client, &args.namespace);

    loop {
        tokio::time::sleep(Duration::from_secs(args.interval)).await;

        match kill_random_pod(&pods, &args).await {
            Ok(_) => {},
            Err(e) => error!("Failed to kill pod: {}", e),
        }
    }
}

async fn kill_random_pod(api: &Api<Pod>, args: &Args) -> anyhow::Result<()> {
    // List all pods
    let list_params = ListParams::default(); // In real usage, might want to filter by label
    let pod_list = api.list(&list_params).await?;
    
    // Filter pods that have the target label key
    let candidates: Vec<_> = pod_list.items.iter()
        .filter(|p| {
            p.metadata.labels.as_ref()
                .map(|l| l.contains_key(&args.selector))
                .unwrap_or(false)
        })
        .collect();

    if candidates.is_empty() {
        info!("No matching pods found to kill.");
        return Ok(());
    }

    // Pick a random victim
    let victim = candidates.choose(&mut rand::thread_rng()).unwrap();
    let name = victim.metadata.name.as_deref().unwrap_or("unknown");

    info!("🎯 Targeting pod: {}", name);

    if !args.dry_run {
        let dp = DeleteParams::default();
        api.delete(name, &dp).await?;
        warn!("💀 Killed pod: {}", name);
    } else {
        info!("(Dry Run) Would have killed pod: {}", name);
    }

    Ok(())
}
