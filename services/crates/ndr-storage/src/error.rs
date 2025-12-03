//! Storage error types

use thiserror::Error;

pub type Result<T> = std::result::Result<T, StorageError>;

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("Database error: {0}")]
    Database(String),
    
    #[error("Connection error: {0}")]
    Connection(String),
    
    #[error("Serialization error: {0}")]
    Serialization(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Core error: {0}")]
    Core(#[from] ndr_core::error::CoreError),
}

impl From<sqlx::Error> for StorageError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => StorageError::NotFound("Record not found".to_string()),
            _ => StorageError::Database(err.to_string()),
        }
    }
}

impl From<redis::RedisError> for StorageError {
    fn from(err: redis::RedisError) -> Self {
        StorageError::Connection(err.to_string())
    }
}
