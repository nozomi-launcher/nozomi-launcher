use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompatToolRelease {
    pub tag_name: String,
    pub published_at: String,
    pub download_url: String,
    pub asset_size: u64,
    /// Populated at fetch-time by the command; not present in on-disk manifest files.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_name: Option<String>,
    /// Populated at fetch-time from the parent manifest's `category`. Used by
    /// the UI to group compatibility tools by category (e.g. "GE-Proton",
    /// "Wine-GE"). Not present in on-disk manifest files.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompatToolManifest {
    pub schema_version: u32,
    /// Category label used by the UI to group compatibility tools. Each
    /// manifest declares its own category — e.g. "GE-Proton" for the official
    /// Glorious Eggroll source. Never hardcoded in the app.
    pub category: String,
    pub generated_at: String,
    pub releases: Vec<CompatToolRelease>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceStatus {
    pub source_name: String,
    pub url: String,
    pub success: bool,
    pub release_count: usize,
    pub error: Option<String>,
    /// Category label carried over from the source's manifest. None if the
    /// source failed to fetch and had no cache entry. The UI uses this to
    /// group compatibility tools.
    pub category: Option<String>,
    /// Unix epoch seconds when this source was last successfully checked
    /// (either a fresh network check or a cache load whose check timestamp
    /// we're inheriting). None means this source has never been checked.
    pub last_checked_epoch_secs: Option<u64>,
    /// True if the data served for this source came from the on-disk cache
    /// without a fresh network call this invocation.
    pub from_cache: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchCompatToolsResult {
    pub releases: Vec<CompatToolRelease>,
    pub source_status: Vec<SourceStatus>,
    /// Most recent `last_checked_epoch_secs` across all sources, or None if
    /// nothing has ever been checked successfully.
    pub last_checked_epoch_secs: Option<u64>,
}
