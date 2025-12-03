//! NDR Core - Shared Domain Models and Business Logic
//!
//! This crate contains the core domain models, business logic, and port interfaces
//! that are shared across all NDR services.

pub mod circuit_breaker;
pub mod domain;
pub mod error;
pub mod ports;
pub mod services;

// Re-export commonly used types
pub use domain::{Alert, Asset, Detection, Event, Severity};
pub use error::{CoreError, Result};
