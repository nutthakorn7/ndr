use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::fmt;

/// Custom error type for edge coordinator with detailed context
#[derive(Debug)]
pub struct AppError {
    message: String,
    context: Option<String>,
    status: StatusCode,
}

impl AppError {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            context: None,
            status: StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    pub fn with_context(mut self, context: impl Into<String>) -> Self {
        self.context = Some(context.into());
        self
    }

    pub fn with_status(mut self, status: StatusCode) -> Self {
        self.status = status;
        self
    }

    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(message).with_status(StatusCode::BAD_REQUEST)
    }

    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::new(message).with_status(StatusCode::UNAUTHORIZED)
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(message).with_status(StatusCode::NOT_FOUND)
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(message).with_status(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if let Some(context) = &self.context {
            write!(f, "{}: {}", self.message, context)
        } else {
            write!(f, "{}", self.message)
        }
    }
}

impl std::error::Error for AppError {}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        // Log the error with full context
        tracing::error!(
            status = %self.status,
            message = %self.message,
            context = ?self.context,
            "Coordinator error"
        );

        // Return user-friendly JSON response
        let body = Json(json!({
            "error": self.message,
            "details": self.context,
            "status": self.status.as_u16(),
        }));

        (self.status, body).into_response()
    }
}

// Convenient conversions from common error types
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        match &err {
            sqlx::Error::RowNotFound => {
                AppError::not_found("Resource not found")
                    .with_context("The requested resource does not exist in the database")
            }
            sqlx::Error::Database(db_err) => {
                AppError::internal(format!("Database error: {}", db_err.message()))
                    .with_context(format!("Code: {:?}", db_err.code()))
            }
            _ => AppError::internal("Database operation failed")
                .with_context(err.to_string())
        }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::bad_request("Invalid JSON format")
            .with_context(err.to_string())
    }
}

// Helper type alias for Results
pub type Result<T> = std::result::Result<T, AppError>;
