//! Domain models for the NDR platform

mod alert;
mod asset;
mod detection;
mod event;

pub use alert::*;
pub use asset::*;
pub use detection::*;
pub use event::*;

use serde::{Deserialize, Serialize};

/// Common severity levels across the platform
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum Severity {
    Critical = 4,
    High = 3,
    Medium = 2,
    Low = 1,
    Info = 0,
}

impl Severity {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Critical => "critical",
            Self::High => "high",
            Self::Medium => "medium",
            Self::Low => "low",
            Self::Info => "info",
        }
    }
}

impl std::fmt::Display for Severity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}
