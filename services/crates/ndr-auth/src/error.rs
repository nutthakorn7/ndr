//! Auth error types

use thiserror::Error;

pub type Result<T> = std::result::Result<T, AuthError>;

#[derive(Error, Debug)]
pub enum AuthError {
    #[error("Invalid token: {0}")]
    InvalidToken(String),

    #[error("Token expired")]
    TokenExpired,

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),
}

impl From<jsonwebtoken::errors::Error> for AuthError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        use jsonwebtoken::errors::ErrorKind;

        match err.kind() {
            ErrorKind::ExpiredSignature => AuthError::TokenExpired,
            _ => AuthError::InvalidToken(err.to_string()),
        }
    }
}
