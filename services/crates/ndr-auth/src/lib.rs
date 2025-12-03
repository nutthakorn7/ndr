//! NDR Auth - Authentication & Authorization
//!
//! JWT validation and permission checking shared across services.

pub mod error;
pub mod jwt;

pub use error::{AuthError, Result};
pub use jwt::{Claims, JwtValidator};
