//! NDR Storage - Database Adapters
//!
//! Implements port interfaces from ndr-core for various databases.

pub mod error;
pub mod opensearch;
pub mod postgres;
pub mod redis;

pub use error::{Result, StorageError};
