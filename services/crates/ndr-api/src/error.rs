//! API error types

use serde::{Deserialize, Serialize};
use thiserror::Error;

pub type ApiResult<T> = std::result::Result<T, ApiError>;

#[derive(Error, Debug, Serialize, Deserialize)]
pub enum ApiError {
    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Internal server error: {0}")]
    InternalError(String),
}

impl ApiError {
    pub fn status_code(&self) -> u16 {
        match self {
            Self::BadRequest(_) => 400,
            Self::Unauthorized(_) => 401,
            Self::Forbidden(_) => 403,
            Self::NotFound(_) => 404,
            Self::InternalError(_) => 500,
        }
    }
}

impl From<ndr_core::error::CoreError> for ApiError {
    fn from(err: ndr_core::error::CoreError) -> Self {
        match err {
            ndr_core::error::CoreError::Validation(msg) => ApiError::BadRequest(msg),
            ndr_core::error::CoreError::NotFound(msg) => ApiError::NotFound(msg),
            ndr_core::error::CoreError::Unauthorized(msg) => ApiError::Unauthorized(msg),
            _ => ApiError::InternalError(err.to_string()),
        }
    }
}
