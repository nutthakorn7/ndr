//! Standard API response wrapper

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub metadata: ResponseMetadata,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResponseMetadata {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub request_id: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            metadata: ResponseMetadata {
                timestamp: chrono::Utc::now(),
                request_id: None,
            },
        }
    }

    pub fn error(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
            metadata: ResponseMetadata {
                timestamp: chrono::Utc::now(),
                request_id: None,
            },
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}
