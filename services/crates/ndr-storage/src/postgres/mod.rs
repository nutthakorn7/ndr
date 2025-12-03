//! PostgreSQL adapters

pub mod alert_repository;
pub mod pool;

pub use alert_repository::PostgresAlertRepository;
pub use pool::create_pool;
