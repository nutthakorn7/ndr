//! Event store port interface

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::domain::{Event, Protocol, Severity};
use crate::error::Result;

/// Event store interface for time-series event data
#[async_trait]
pub trait EventStore: Send + Sync {
    /// Store a new event
    async fn store(&self, event: Event) -> Result<()>;
    
    /// Store multiple events in bulk
    async fn store_bulk(&self, events: Vec<Event>) -> Result<()>;
    
    /// Find event by ID
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Event>>;
    
    /// Search events with filters
    async fn search(
        &self,
        filters: EventFilters,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Event>>;
    
    /// Count events matching filters
    async fn count(&self, filters: EventFilters) -> Result<u64>;
    
    /// Get events in time range
    async fn get_time_range(
        &self,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
        limit: usize,
    ) -> Result<Vec<Event>>;
}

#[derive(Debug, Clone, Default)]
pub struct EventFilters {
    pub source_ip: Option<String>,
    pub dest_ip: Option<String>,
    pub protocol: Option<Protocol>,
    pub severity: Option<Severity>,
    pub event_type: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
}
