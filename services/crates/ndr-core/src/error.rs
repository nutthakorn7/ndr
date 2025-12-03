//! Core error types for the NDR platform

use thiserror::Error;

pub type Result<T> = std::result::Result<T, CoreError>;

#[derive(Error, Debug)]
pub enum CoreError {
    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Already exists: {0}")]
    AlreadyExists(String),

    #[error("Invalid state: {0}")]
    InvalidState(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

pub type AppError = CoreError;

impl CoreError {
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::Validation(msg.into())
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::NotFound(msg.into())
    }

    pub fn invalid_state(msg: impl Into<String>) -> Self {
        Self::InvalidState(msg.into())
    }

    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }
}

impl From<anyhow::Error> for CoreError {
    fn from(err: anyhow::Error) -> Self {
        Self::Internal(err.to_string())
    }
}

impl From<uuid::Error> for CoreError {
    fn from(err: uuid::Error) -> Self {
        Self::Validation(format!("Invalid UUID: {}", err))
    }
}

impl From<std::io::Error> for CoreError {
    fn from(err: std::io::Error) -> Self {
        Self::Internal(format!("IO Error: {}", err))
    }
}
