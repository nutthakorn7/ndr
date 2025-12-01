use rust_edge_agent::buffer::{Buffer, BufferedEvent};
use anyhow::Result;

#[tokio::test]
async fn test_buffer_creation() -> Result<()> {
    // Test creating buffer with in-memory database
    let buffer = Buffer::new(":memory:", 100).await?;
    
    // Verify initial state
    let count = buffer.count().await?;
    assert_eq!(count, 0, "New buffer should be empty");
    
    Ok(())
}

#[tokio::test]
async fn test_buffer_push_and_count() -> Result<()> {
    let buffer = Buffer::new(":memory:", 100).await?;
    
    // Push single event
    buffer.push("{\"test\":\"data1\"}", 10).await?;
    assert_eq!(buffer.count().await?, 1);
    
    // Push multiple events
    buffer.push("{\"test\":\"data2\"}", 20).await?;
    buffer.push("{\"test\":\"data3\"}", 30).await?;
    
    assert_eq!(buffer.count().await?, 3);
    
    Ok(())
}

#[tokio::test]
async fn test_buffer_pop_batch() -> Result<()> {
    let buffer = Buffer::new(":memory:", 100).await?;
    
    // Push test events
    buffer.push("{\"event\":\"1\"}", 10).await?;
    buffer.push("{\"event\":\"2\"}", 20).await?;
    buffer.push("{\"event\":\"3\"}", 30).await?;
    
    // Pop batch of 2
    let events = buffer.pop_batch(2).await?;
    assert_eq!(events.len(), 2);
    
    // Events should be ordered by priority (desc), then created_at (asc)
    // So we should get priority 30 first, then 20
    assert_eq!(events[0].priority, 30);
    assert_eq!(events[1].priority, 20);
    
    // Count should still be 3 (pop doesn't remove)
    assert_eq!(buffer.count().await?, 3);
    
    Ok(())
}

#[tokio::test]
async fn test_buffer_priority_ordering() -> Result<()> {
    let buffer = Buffer::new(":memory:", 100).await?;
    
    // Push events with different priorities
    buffer.push("{\"event\":\"low\"}", 10).await?;
    buffer.push("{\"event\":\"critical\"}", 100).await?;
    buffer.push("{\"event\":\"medium\"}", 50).await?;
    buffer.push("{\"event\":\"high\"}", 75).await?;
    
    // Pop all events
    let events = buffer.pop_batch(10).await?;
    
    // Verify priority ordering (highest first)
    assert_eq!(events.len(), 4);
    assert_eq!(events[0].priority, 100); // critical
    assert_eq!(events[1].priority, 75);  // high
    assert_eq!(events[2].priority, 50);  // medium
    assert_eq!(events[3].priority, 10);  // low
    
    Ok(())
}

#[tokio::test]
async fn test_buffer_remove() -> Result<()> {
    let buffer = Buffer::new(":memory:", 100).await?;
    
    // Push events
    buffer.push("{\"event\":\"1\"}", 10).await?;
    buffer.push("{\"event\":\"2\"}", 20).await?;
    buffer.push("{\"event\":\"3\"}", 30).await?;
    
    assert_eq!(buffer.count().await?, 3);
    
    // Get events
    let events = buffer.pop_batch(2).await?;
    let ids: Vec<i64> = events.iter().map(|e| e.id).collect();
    
    // Remove them
    buffer.remove(&ids).await?;
    
    // Count should decrease
    assert_eq!(buffer.count().await?, 1);
    
    // Remaining event should be the lowest priority one
    let remaining = buffer.pop_batch(1).await?;
    assert_eq!(remaining[0].priority, 10);
    
    Ok(())
}

#[tokio::test]
async fn test_buffer_remove_empty_list() -> Result<()> {
    let buffer = Buffer::new(":memory:", 100).await?;
    
    // Push event
    buffer.push("{\"event\":\"1\"}", 10).await?;
    
    // Remove empty list should not error
    buffer.remove(&[]).await?;
    
    // Count should be unchanged
    assert_eq!(buffer.count().await?, 1);
    
    Ok(())
}

#[tokio::test]
async fn test_buffer_pop_batch_limit() -> Result<()> {
    let buffer = Buffer::new(":memory:", 100).await?;
    
    // Push 10 events
    for i in 0..10 {
        buffer.push(&format!("{{\"event\":\"{}\"}}", i), i).await?;
    }
    
    // Request batch of 5
    let events = buffer.pop_batch(5).await?;
    assert_eq!(events.len(), 5);
    
    // Request more than available
    buffer.remove(&events.iter().map(|e| e.id).collect::<Vec<_>>()).await?;
    let events = buffer.pop_batch(100).await?;
    assert_eq!(events.len(), 5); // Only 5 remaining
    
    Ok(())
}

#[tokio::test]
async fn test_buffer_empty_pop() -> Result<()> {
    let buffer = Buffer::new(":memory:", 100).await?;
    
    // Pop from empty buffer
    let events = buffer.pop_batch(10).await?;
    assert_eq!(events.len(), 0);
    
    Ok(())
}

#[tokio::test]
async fn test_buffer_event_data_integrity() -> Result<()> {
    let buffer = Buffer::new(":memory:", 100).await?;
    
    let test_data = r#"{"event":"test","complex":{"nested":"data"},"array":[1,2,3]}"#;
    buffer.push(test_data, 50).await?;
    
    let events = buffer.pop_batch(1).await?;
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].event_data, test_data);
    assert_eq!(events[0].priority, 50);
    
    Ok(())
}

#[tokio::test]
async fn test_buffer_concurrent_operations() -> Result<()> {
    let buffer = Buffer::new(":memory:", 100).await?;
    
    // Spawn multiple tasks pushing events
    let handles: Vec<_> = (0..10)
        .map(|i| {
            let b = buffer.clone();
            tokio::spawn(async move {
                b.push(&format!("{{\"event\":\"{}\"}}", i), i).await
            })
        })
        .collect();
    
    // Wait for all to complete
    for handle in handles {
        handle.await??;
    }
    
    // Verify all events were added
    assert_eq!(buffer.count().await?, 10);
    
    Ok(())
}

#[tokio::test]
async fn test_buffer_size_tracking() -> Result<()> {
    let buffer = Buffer::new(":memory:", 100).await?;
    
    // Initial size should be small
    let initial_size = buffer.size_mb().await?;
    assert!(initial_size < 1.0, "Initial buffer should be < 1MB");
    
    // Add some events
    for i in 0..100 {
        buffer.push(&format!("{{\"event\":\"{}\",\"data\":\"x\".repeat(1000)}}", i), i % 10).await?;
    }
    
    // Size should increase
    let after_size = buffer.size_mb().await?;
    assert!(after_size > initial_size, "Size should increase after adding events");
    
    Ok(())
}

#[tokio::test]
async fn test_buffer_large_batch() -> Result<()> {
    let buffer = Buffer::new(":memory:", 100).await?;
    
    // Add 1000 events
    for i in 0..1000 {
        buffer.push(&format!("{{\"id\":{}}}", i), i % 100).await?;
    }
    
    assert_eq!(buffer.count().await?, 1000);
    
    // Pop large batch
    let events = buffer.pop_batch(500).await?;
    assert_eq!(events.len(), 500);
    
    // Remove them
    buffer.remove(&events.iter().map(|e| e.id).collect::<Vec<_>>()).await?;
    assert_eq!(buffer.count().await?, 500);
    
    Ok(())
}

#[tokio::test]
async fn test_buffer_timestamp_ordering() -> Result<()> {
    let buffer = Buffer::new(":memory:", 100).await?;
    
    // Push events with SAME priority but at different times
    buffer.push("{\"event\":\"first\"}", 50).await?;
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    buffer.push("{\"event\":\"second\"}", 50).await?;
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    buffer.push("{\"event\":\"third\"}", 50).await?;
    
    // With same priority, should be ordered by created_at ASC (FIFO)
    let events = buffer.pop_batch(3).await?;
    assert!(events[0].event_data.contains("first"));
    assert!(events[1].event_data.contains("second"));
    assert!(events[2].event_data.contains("third"));
    
    Ok(())
}

#[tokio::test]
async fn test_buffer_idempotent_remove() -> Result<()> {
    let buffer = Buffer::new(":memory:", 100).await?;
    
    buffer.push("{\"event\":\"test\"}", 10).await?;
    let events = buffer.pop_batch(1).await?;
    let id = events[0].id;
    
    // Remove once
    buffer.remove(&[id]).await?;
    assert_eq!(buffer.count().await?, 0);
    
    // Remove again (should not error)
    buffer.remove(&[id]).await?;
    assert_eq!(buffer.count().await?, 0);
    
    Ok(())
}
