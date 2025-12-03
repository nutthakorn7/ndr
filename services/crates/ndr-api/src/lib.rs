//! NDR API - Shared API Types
//! 
//! DTOs and API contracts shared across services.

pub mod dto;
pub mod request;
pub mod response;
pub mod error;

pub use error::{ApiError, ApiResult};
pub use response::ApiResponse;
