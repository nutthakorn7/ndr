//! NDR Storage - Database Adapters
//! 
//! Implements port interfaces from ndr-core for various databases.

pub mod postgres;
pub mod redis;
pub mod opensearch;
pub mod error;

pub use error::{StorageError, Result};
