//! JWT validation

use chrono::{DateTime, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::error::{AuthError, Result};

/// JWT claims
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,  // Subject (user ID)
    pub email: String,
    pub roles: Vec<String>,
    pub exp: i64,     // Expiration time
    pub iat: i64,     // Issued at
}

/// JWT validator
pub struct JwtValidator {
    secret: String,
}

impl JwtValidator {
    pub fn new(secret: String) -> Self {
        Self { secret }
    }

    /// Validate a JWT token
    pub fn validate(&self, token: &str) -> Result<Claims> {
        let decoding_key = DecodingKey::from_secret(self.secret.as_bytes());
        let validation = Validation::default();
        
        let token_data = decode::<Claims>(token, &decoding_key, &validation)?;
        Ok(token_data.claims)
    }

    /// Create a new JWT token
    pub fn create_token(
        &self,
        user_id: String,
        email: String,
        roles: Vec<String>,
        expires_in_hours: i64,
    ) -> Result<String> {
        let now = Utc::now();
        let exp = (now + chrono::Duration::hours(expires_in_hours)).timestamp();
        
        let claims = Claims {
            sub: user_id,
            email,
            roles,
            exp,
            iat: now.timestamp(),
        };

        let encoding_key = EncodingKey::from_secret(self.secret.as_bytes());
        let token = encode(&Header::default(), &claims, &encoding_key)
            .map_err(|e| AuthError::InvalidToken(e.to_string()))?;
        
        Ok(token)
    }

    /// Check if user has a specific role
    pub fn has_role(claims: &Claims, role: &str) -> bool {
        claims.roles.iter().any(|r| r == role)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jwt_creation_and_validation() {
        let secret = "test_secret_key".to_string();
        let validator = JwtValidator::new(secret);
        
        let token = validator.create_token(
            "user123".to_string(),
            "user@example.com".to_string(),
            vec!["analyst".to_string()],
            24,
        ).unwrap();
        
        let claims = validator.validate(&token).unwrap();
        assert_eq!(claims.sub, "user123");
        assert_eq!(claims.email, "user@example.com");
        assert!(JwtValidator::has_role(&claims, "analyst"));
    }
}
