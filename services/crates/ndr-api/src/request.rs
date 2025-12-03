//! Common request types

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct  PaginationParams {
    #[serde(default = "default_page")]
    pub page: u32,
    
    #[serde(default = "default_page_size")]
    pub page_size: u32,
}

fn default_page() -> u32 {
    1
}

fn default_page_size() -> u32 {
    20
}

impl Default for PaginationParams {
    fn default() -> Self {
        Self {
            page: 1,
            page_size: 20,
        }
    }
}
