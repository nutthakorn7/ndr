use clap::Parser;
use hdrhistogram::Histogram;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Target URL to test
    #[arg(short, long, default_value = "http://localhost:8080/ingest")]
    url: String,

    /// Number of concurrent workers
    #[arg(short, long, default_value_t = 50)]
    concurrency: usize,

    /// Test duration in seconds
    #[arg(short, long, default_value_t = 30)]
    duration: u64,

    /// Payload size in bytes (approximate)
    #[arg(short, long, default_value_t = 1024)]
    payload_size: usize,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();

    println!("🚀 Starting Load Test");
    println!("Target: {}", args.url);
    println!("Concurrency: {}", args.concurrency);
    println!("Duration: {}s", args.duration);
    println!("Payload Size: {} bytes", args.payload_size);

    let client = reqwest::Client::builder()
        .pool_max_idle_per_host(args.concurrency)
        .timeout(Duration::from_secs(5))
        .build()?;

    let payload = serde_json::json!({
        "event_type": "network_flow",
        "source_ip": "192.168.1.100",
        "dest_ip": "10.0.0.5",
        "protocol": "TCP",
        "bytes": 500,
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "data": "x".repeat(args.payload_size)
    });

    let start_time = Instant::now();
    let end_time = start_time + Duration::from_secs(args.duration);
    
    let latencies = Arc::new(Mutex::new(Histogram::<u64>::new(3).unwrap()));
    let success_count = Arc::new(std::sync::atomic::AtomicU64::new(0));
    let error_count = Arc::new(std::sync::atomic::AtomicU64::new(0));
    
    let semaphore = Arc::new(Semaphore::new(args.concurrency));
    let mut tasks = Vec::new();

    while Instant::now() < end_time {
        let permit = semaphore.clone().acquire_owned().await?;
        let client = client.clone();
        let url = args.url.clone();
        let payload = payload.clone();
        let latencies = latencies.clone();
        let success_count = success_count.clone();
        let error_count = error_count.clone();

        let task = tokio::spawn(async move {
            let _permit = permit; // Hold permit until task completes
            let request_start = Instant::now();
            
            match client.post(&url).json(&payload).send().await {
                Ok(resp) => {
                    let elapsed = request_start.elapsed().as_micros() as u64;
                    if resp.status().is_success() {
                        success_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                        let mut hist = latencies.lock().unwrap();
                        let _ = hist.record(elapsed);
                    } else {
                        error_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                    }
                }
                Err(_) => {
                    error_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                }
            }
        });
        tasks.push(task);
        
        // Small yield to prevent loop from hogging CPU entirely
        if tasks.len() % 100 == 0 {
            tokio::task::yield_now().await;
        }
    }

    // Wait for pending requests (optional, or just hard stop)
    // For a load test, we usually just stop measuring.

    let duration = start_time.elapsed();
    let successes = success_count.load(std::sync::atomic::Ordering::Relaxed);
    let errors = error_count.load(std::sync::atomic::Ordering::Relaxed);
    let total = successes + errors;
    let rps = successes as f64 / duration.as_secs_f64();

    println!("\n📊 Test Results");
    println!("----------------");
    println!("Total Requests: {}", total);
    println!("Successful:     {}", successes);
    println!("Failed:         {}", errors);
    println!("Duration:       {:.2}s", duration.as_secs_f64());
    println!("Throughput:     {:.2} req/s", rps);

    let hist = latencies.lock().unwrap();
    println!("\n⏱️  Latency (us)");
    println!("----------------");
    println!("Min:    {}", hist.min());
    println!("p50:    {}", hist.value_at_quantile(0.5));
    println!("p95:    {}", hist.value_at_quantile(0.95));
    println!("p99:    {}", hist.value_at_quantile(0.99));
    println!("Max:    {}", hist.max());

    Ok(())
}
