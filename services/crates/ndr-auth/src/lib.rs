//! NDR Auth - Authentication & Authorization
//! 
//! JWT validation and permission checking shared across services.

pub mod jwt;
pub mod error;

pub use error::{AuthError, Result};
pub use jwt::{Claims, JwtValidator};
