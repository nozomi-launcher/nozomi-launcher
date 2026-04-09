use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtonGeRelease {
    pub tag_name: String,
    pub published_at: String,
    pub download_url: String,
    pub asset_size: u64,
}
