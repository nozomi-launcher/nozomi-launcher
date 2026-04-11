use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtonGeRelease {
    pub tag_name: String,
    pub published_at: String,
    pub download_url: String,
    pub asset_size: u64,
    /// Populated at fetch-time by the command; not present in on-disk manifest files.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtonGeManifest {
    #[allow(dead_code)]
    pub schema_version: u32,
    #[allow(dead_code)]
    pub generated_at: String,
    pub releases: Vec<ProtonGeRelease>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceStatus {
    pub source_name: String,
    pub url: String,
    pub success: bool,
    pub release_count: usize,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchReleasesResult {
    pub releases: Vec<ProtonGeRelease>,
    pub source_status: Vec<SourceStatus>,
}
