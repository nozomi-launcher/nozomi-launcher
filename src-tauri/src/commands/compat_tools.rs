use crate::commands::settings::get_settings;
use crate::models::compat_tools::{
    CompatToolManifest, CompatToolRelease, FetchCompatToolsResult, InstallProgress, SourceStatus,
};
use crate::models::settings::CompatToolSource;
use crate::steam::env;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::Emitter;

pub const DEFAULT_MANIFEST_URL: &str =
    "https://raw.githubusercontent.com/nozomi-launcher/nozomi-launcher/main/manifests/proton-ge.json";
pub const DEFAULT_MANIFEST_NAME: &str = "Proton-GE Official";
const REQUEST_TIMEOUT_SECS: u64 = 30;
const STALE_AFTER_SECS: u64 = 24 * 60 * 60;
const CACHE_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CachedManifest {
    schema_version: u32,
    last_checked_epoch_secs: u64,
    manifest: CompatToolManifest,
}

/// Result of resolving a single source — either from cache, from the network,
/// or a mix (network failed but we had a cache to fall back on).
#[derive(Debug, Clone)]
struct SourceFetchResult {
    manifest: Option<CompatToolManifest>,
    last_checked_epoch_secs: Option<u64>,
    from_cache: bool,
    error: Option<String>,
}

fn default_source() -> CompatToolSource {
    CompatToolSource {
        id: "default".to_string(),
        name: DEFAULT_MANIFEST_NAME.to_string(),
        url: DEFAULT_MANIFEST_URL.to_string(),
        enabled: true,
    }
}

fn now_epoch_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn cache_root() -> Result<PathBuf, String> {
    let config = dirs::config_dir()
        .or_else(|| dirs::home_dir().map(|h| h.join(".config")))
        .ok_or_else(|| "Could not determine config directory".to_string())?;
    Ok(config.join("nozomi-launcher/cache/compat-tools"))
}

/// Sanitize a source id for safe use as a filename: keep alphanumerics, `-`,
/// and `_`; replace everything else with `_`. User source ids are UUIDs so
/// this is just defense-in-depth against an attacker-controlled settings file.
fn sanitize_source_id(id: &str) -> String {
    id.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

fn cache_path_for_id(root: &Path, source_id: &str) -> PathBuf {
    root.join(format!("{}.json", sanitize_source_id(source_id)))
}

fn load_cache(path: &Path) -> Option<CachedManifest> {
    let content = std::fs::read_to_string(path).ok()?;
    let parsed: CachedManifest = serde_json::from_str(&content).ok()?;
    if parsed.schema_version != CACHE_SCHEMA_VERSION {
        return None;
    }
    Some(parsed)
}

fn save_cache(path: &Path, cache: &CachedManifest) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("create cache dir: {e}"))?;
    }
    let json = serde_json::to_string_pretty(cache).map_err(|e| format!("serialize cache: {e}"))?;
    std::fs::write(path, json).map_err(|e| format!("write cache: {e}"))?;
    Ok(())
}

/// Pure staleness check: should we hit the network for this source?
fn is_stale(cached: Option<&CachedManifest>, now_secs: u64, force: bool) -> bool {
    if force {
        return true;
    }
    match cached {
        None => true,
        Some(c) => now_secs.saturating_sub(c.last_checked_epoch_secs) >= STALE_AFTER_SECS,
    }
}

/// Pure: given existing cache state and a fresh network result, decide what
/// to return and what (if anything) to persist back to disk.
///
/// Semantics:
/// - Fresh fetch ok + strictly newer `generatedAt` → persist fresh manifest.
/// - Fresh fetch ok + same/older `generatedAt` → persist cached manifest with
///   bumped `last_checked_epoch_secs` (so the throttle resets).
/// - Fresh fetch failed + have cache → serve cache, no write, surface the
///   error so the UI can show it.
/// - Fresh fetch failed + no cache → error out with no data.
fn merge_fetched_with_cache(
    cached: Option<CachedManifest>,
    fresh: Result<CompatToolManifest, String>,
    now_secs: u64,
) -> (SourceFetchResult, Option<CachedManifest>) {
    match fresh {
        Ok(new_manifest) => {
            let keep = match &cached {
                Some(c) if new_manifest.generated_at <= c.manifest.generated_at => {
                    c.manifest.clone()
                }
                _ => new_manifest,
            };
            let new_cache = CachedManifest {
                schema_version: CACHE_SCHEMA_VERSION,
                last_checked_epoch_secs: now_secs,
                manifest: keep.clone(),
            };
            let result = SourceFetchResult {
                manifest: Some(keep),
                last_checked_epoch_secs: Some(now_secs),
                from_cache: false,
                error: None,
            };
            (result, Some(new_cache))
        }
        Err(err) => match cached {
            Some(c) => {
                let result = SourceFetchResult {
                    manifest: Some(c.manifest),
                    last_checked_epoch_secs: Some(c.last_checked_epoch_secs),
                    from_cache: true,
                    error: Some(err),
                };
                (result, None)
            }
            None => {
                let result = SourceFetchResult {
                    manifest: None,
                    last_checked_epoch_secs: None,
                    from_cache: false,
                    error: Some(err),
                };
                (result, None)
            }
        },
    }
}

async fn fetch_one_network(
    client: &reqwest::Client,
    source: &CompatToolSource,
) -> Result<CompatToolManifest, String> {
    let response = client
        .get(&source.url)
        .header("User-Agent", "nozomi-launcher")
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                format!("Timeout after {REQUEST_TIMEOUT_SECS}s")
            } else {
                format!("Request failed: {e}")
            }
        })?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    response
        .json::<CompatToolManifest>()
        .await
        .map_err(|e| format!("Invalid manifest JSON: {e}"))
}

async fn resolve_single(
    client: &reqwest::Client,
    cache_root_dir: &Path,
    source: CompatToolSource,
    now_secs: u64,
    force: bool,
) -> (CompatToolSource, SourceFetchResult) {
    let cache_path = cache_path_for_id(cache_root_dir, &source.id);
    let cached = load_cache(&cache_path);

    if !is_stale(cached.as_ref(), now_secs, force) {
        let c = cached.expect("is_stale=false implies Some(cached)");
        let result = SourceFetchResult {
            manifest: Some(c.manifest),
            last_checked_epoch_secs: Some(c.last_checked_epoch_secs),
            from_cache: true,
            error: None,
        };
        return (source, result);
    }

    let fresh = fetch_one_network(client, &source).await;
    let (result, new_cache) = merge_fetched_with_cache(cached, fresh, now_secs);
    if let Some(new_cache) = new_cache {
        // Best-effort: if the cache write fails, log-silent and continue.
        let _ = save_cache(&cache_path, &new_cache);
    }
    (source, result)
}

/// Pure merge function: takes per-source fetch results, injects `sourceName`
/// into each release, dedupes by tag name (first source wins), and builds
/// structured status. Separate from `fetch_compat_tools` so it can be
/// unit-tested without HTTP.
fn merge_sources(results: Vec<(CompatToolSource, SourceFetchResult)>) -> FetchCompatToolsResult {
    let mut all_releases: Vec<CompatToolRelease> = Vec::new();
    let mut seen_tags: HashSet<String> = HashSet::new();
    let mut source_status: Vec<SourceStatus> = Vec::new();
    let mut most_recent_check: Option<u64> = None;

    for (source, result) in results {
        let SourceFetchResult {
            manifest,
            last_checked_epoch_secs,
            from_cache,
            error,
        } = result;

        let success = manifest.is_some();
        let release_count = manifest.as_ref().map(|m| m.releases.len()).unwrap_or(0);
        let category = manifest.as_ref().map(|m| m.category.clone());

        if let Some(m) = manifest {
            let manifest_category = m.category;
            for mut release in m.releases {
                release.source_name = Some(source.name.clone());
                release.category = Some(manifest_category.clone());
                if seen_tags.insert(release.tag_name.clone()) {
                    all_releases.push(release);
                }
            }
        }

        source_status.push(SourceStatus {
            source_name: source.name,
            url: source.url,
            success,
            release_count,
            error,
            category,
            last_checked_epoch_secs,
            from_cache,
        });

        if let Some(ts) = last_checked_epoch_secs {
            most_recent_check = Some(most_recent_check.map_or(ts, |m| m.max(ts)));
        }
    }

    FetchCompatToolsResult {
        releases: all_releases,
        source_status,
        last_checked_epoch_secs: most_recent_check,
    }
}

#[tauri::command]
pub async fn fetch_compat_tools(force: Option<bool>) -> Result<FetchCompatToolsResult, String> {
    let force = force.unwrap_or(false);
    let settings = get_settings()?;

    // Default source is always first so it wins dedupe ties.
    let mut sources = vec![default_source()];
    sources.extend(
        settings
            .compat_tool_sources
            .into_iter()
            .filter(|s| s.enabled),
    );

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let cache_root_dir = cache_root()?;
    let now_secs = now_epoch_secs();

    let fetches = sources
        .into_iter()
        .map(|s| resolve_single(&client, &cache_root_dir, s, now_secs, force));
    let paired = futures::future::join_all(fetches).await;

    let merged = merge_sources(paired);

    // Hard error only when literally every source failed with no data at all.
    if merged.releases.is_empty() && merged.source_status.iter().all(|s| !s.success) {
        let joined = merged
            .source_status
            .iter()
            .filter_map(|s| s.error.as_ref().map(|e| format!("{}: {e}", s.source_name)))
            .collect::<Vec<_>>()
            .join("; ");
        return Err(format!("All manifest sources failed: {joined}"));
    }

    Ok(merged)
}

/// Get or create the compatibility tools directory under Steam root.
fn get_or_create_compat_tools_dir() -> Result<PathBuf, String> {
    let root = env::steam_root().ok_or("Could not find Steam root directory")?;
    let dir = root.join("compatibilitytools.d");
    if !dir.exists() {
        std::fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create compatibilitytools.d: {e}"))?;
    }
    Ok(dir)
}

/// Validate a tag name to prevent path traversal attacks.
fn is_safe_tag_name(tag: &str) -> bool {
    !tag.is_empty()
        && !tag.contains('/')
        && !tag.contains('\\')
        && !tag.contains("..")
        && tag != "."
}

#[tauri::command]
pub async fn install_compat_tool(
    app_handle: tauri::AppHandle,
    download_url: String,
    tag_name: String,
    asset_size: u64,
) -> Result<(), String> {
    if !is_safe_tag_name(&tag_name) {
        return Err(format!("Invalid tag name: {tag_name}"));
    }

    let compat_dir = get_or_create_compat_tools_dir()?;
    let target_dir = compat_dir.join(&tag_name);
    if target_dir.exists() {
        return Err(format!("{tag_name} is already installed"));
    }

    let emit_progress = |stage: &str, bytes: u64| {
        let pct = if asset_size > 0 {
            (bytes as f64 / asset_size as f64 * 100.0).min(100.0)
        } else {
            0.0
        };
        let _ = app_handle.emit(
            "compat-tool-install-progress",
            InstallProgress {
                tag_name: tag_name.clone(),
                stage: stage.to_string(),
                bytes_downloaded: bytes,
                total_bytes: asset_size,
                progress_pct: pct,
            },
        );
    };

    emit_progress("downloading", 0);

    // Download with streaming
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let response = client
        .get(&download_url)
        .header("User-Agent", "nozomi-launcher")
        .send()
        .await
        .map_err(|e| {
            emit_progress("error", 0);
            format!("Download failed: {e}")
        })?;

    if !response.status().is_success() {
        emit_progress("error", 0);
        return Err(format!("Download failed: HTTP {}", response.status()));
    }

    let temp_file = std::env::temp_dir().join(format!("nozomi-download-{tag_name}.tar.gz"));
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();
    let mut file = tokio::fs::File::create(&temp_file)
        .await
        .map_err(|e| format!("Failed to create temp file: {e}"))?;

    use tokio::io::AsyncWriteExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| {
            emit_progress("error", downloaded);
            format!("Download stream error: {e}")
        })?;
        file.write_all(&chunk).await.map_err(|e| {
            emit_progress("error", downloaded);
            format!("Failed to write to temp file: {e}")
        })?;
        downloaded += chunk.len() as u64;
        emit_progress("downloading", downloaded);
    }
    file.flush().await.map_err(|e| format!("Flush failed: {e}"))?;
    drop(file);

    emit_progress("extracting", downloaded);

    // Extract tar.gz in a blocking task
    let temp_file_clone = temp_file.clone();
    let compat_dir_clone = compat_dir.clone();
    tokio::task::spawn_blocking(move || {
        let file = std::fs::File::open(&temp_file_clone)
            .map_err(|e| format!("Failed to open downloaded file: {e}"))?;
        let decoder = flate2::read::GzDecoder::new(file);
        let mut archive = tar::Archive::new(decoder);
        archive.set_overwrite(false);

        // Validate all archive entries against path traversal before extracting
        let file2 = std::fs::File::open(&temp_file_clone)
            .map_err(|e| format!("Failed to reopen archive: {e}"))?;
        let decoder2 = flate2::read::GzDecoder::new(file2);
        let mut check_archive = tar::Archive::new(decoder2);
        for entry in check_archive
            .entries()
            .map_err(|e| format!("Failed to read archive entries: {e}"))?
        {
            let entry = entry.map_err(|e| format!("Bad archive entry: {e}"))?;
            let path = entry.path().map_err(|e| format!("Bad entry path: {e}"))?;
            if path
                .components()
                .any(|c| matches!(c, std::path::Component::ParentDir))
            {
                return Err("Archive contains path traversal — aborting".to_string());
            }
        }

        archive
            .unpack(&compat_dir_clone)
            .map_err(|e| format!("Failed to extract archive: {e}"))?;
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| format!("Extract task panicked: {e}"))??;

    // Clean up temp file
    let _ = tokio::fs::remove_file(&temp_file).await;

    emit_progress("done", downloaded);
    Ok(())
}

#[tauri::command]
pub async fn uninstall_compat_tool(tag_name: String) -> Result<(), String> {
    if !is_safe_tag_name(&tag_name) {
        return Err(format!("Invalid tag name: {tag_name}"));
    }

    let compat_dir = get_or_create_compat_tools_dir()?;
    let target_dir = compat_dir.join(&tag_name);

    if !target_dir.exists() {
        return Err(format!("{tag_name} is not installed"));
    }

    // Ensure the target is actually inside compat_dir (defense-in-depth)
    let canonical_compat = compat_dir
        .canonicalize()
        .map_err(|e| format!("canonicalize compat dir: {e}"))?;
    let canonical_target = target_dir
        .canonicalize()
        .map_err(|e| format!("canonicalize target: {e}"))?;
    if !canonical_target.starts_with(&canonical_compat) {
        return Err("Target path escapes compatibility tools directory".to_string());
    }

    std::fs::remove_dir_all(&target_dir)
        .map_err(|e| format!("Failed to remove {tag_name}: {e}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_manifest_json() -> &'static str {
        r#"{
            "schemaVersion": 1,
            "category": "GE-Proton",
            "generatedAt": "2026-04-09T06:00:00Z",
            "source": "https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases",
            "releases": [
                {
                    "tagName": "GE-Proton9-27",
                    "publishedAt": "2026-04-01T12:00:00Z",
                    "downloadUrl": "https://github.com/GloriousEggroll/proton-ge-custom/releases/download/GE-Proton9-27/GE-Proton9-27.tar.gz",
                    "assetSize": 400000000
                },
                {
                    "tagName": "GE-Proton9-26",
                    "publishedAt": "2026-03-15T10:00:00Z",
                    "downloadUrl": "https://github.com/GloriousEggroll/proton-ge-custom/releases/download/GE-Proton9-26/GE-Proton9-26.tar.gz",
                    "assetSize": 390000000
                }
            ]
        }"#
    }

    fn make_source(id: &str, name: &str) -> CompatToolSource {
        CompatToolSource {
            id: id.to_string(),
            name: name.to_string(),
            url: format!("https://example.com/{id}.json"),
            enabled: true,
        }
    }

    fn make_release(tag: &str) -> CompatToolRelease {
        CompatToolRelease {
            tag_name: tag.to_string(),
            published_at: "2026-04-01T12:00:00Z".to_string(),
            download_url: format!("https://example.com/{tag}.tar.gz"),
            asset_size: 1000,
            source_name: None,
            category: None,
        }
    }

    fn make_manifest(generated_at: &str, tags: &[&str]) -> CompatToolManifest {
        make_manifest_with_category(generated_at, "GE-Proton", tags)
    }

    fn make_manifest_with_category(
        generated_at: &str,
        category: &str,
        tags: &[&str],
    ) -> CompatToolManifest {
        CompatToolManifest {
            schema_version: 1,
            category: category.to_string(),
            generated_at: generated_at.to_string(),
            releases: tags.iter().map(|t| make_release(t)).collect(),
        }
    }

    fn make_cache(generated_at: &str, tags: &[&str], last_checked: u64) -> CachedManifest {
        CachedManifest {
            schema_version: CACHE_SCHEMA_VERSION,
            last_checked_epoch_secs: last_checked,
            manifest: make_manifest(generated_at, tags),
        }
    }

    fn make_fetch_result(
        manifest: Option<CompatToolManifest>,
        last_checked: Option<u64>,
        from_cache: bool,
        error: Option<&str>,
    ) -> SourceFetchResult {
        SourceFetchResult {
            manifest,
            last_checked_epoch_secs: last_checked,
            from_cache,
            error: error.map(String::from),
        }
    }

    #[test]
    fn manifest_deserializes_releases() {
        let manifest: CompatToolManifest = serde_json::from_str(sample_manifest_json()).unwrap();
        assert_eq!(manifest.schema_version, 1);
        assert_eq!(manifest.category, "GE-Proton");
        assert_eq!(manifest.releases.len(), 2);
        assert_eq!(manifest.releases[0].tag_name, "GE-Proton9-27");
        assert_eq!(manifest.releases[0].asset_size, 400000000);
        assert!(manifest.releases[0].download_url.ends_with(".tar.gz"));
    }

    #[test]
    fn manifest_ignores_unknown_fields() {
        let json = r#"{
            "schemaVersion": 1,
            "category": "GE-Proton",
            "generatedAt": "2026-04-09T06:00:00Z",
            "source": "https://example.com",
            "futureField": "who knows",
            "releases": [
                {
                    "tagName": "GE-Proton9-27",
                    "publishedAt": "2026-04-01T12:00:00Z",
                    "downloadUrl": "https://example.com/a.tar.gz",
                    "assetSize": 100,
                    "extraReleaseField": 42
                }
            ]
        }"#;
        let manifest: CompatToolManifest = serde_json::from_str(json).unwrap();
        assert_eq!(manifest.releases.len(), 1);
    }

    #[test]
    fn compat_tool_release_serde_roundtrip() {
        let release = CompatToolRelease {
            tag_name: "GE-Proton9-27".to_string(),
            published_at: "2026-04-01T12:00:00Z".to_string(),
            download_url: "https://example.com/GE-Proton9-27.tar.gz".to_string(),
            asset_size: 400000000,
            source_name: None,
            category: None,
        };

        let json = serde_json::to_string(&release).unwrap();
        let deserialized: CompatToolRelease = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.tag_name, "GE-Proton9-27");
        assert_eq!(deserialized.asset_size, 400000000);

        assert!(json.contains("tagName"));
        assert!(json.contains("publishedAt"));
        assert!(json.contains("downloadUrl"));
        assert!(json.contains("assetSize"));
    }

    #[test]
    fn is_stale_no_cache_is_stale() {
        assert!(is_stale(None, 1_000_000, false));
    }

    #[test]
    fn is_stale_force_always_true() {
        let cache = make_cache("2026-04-09T00:00:00Z", &[], 1_000_000);
        assert!(is_stale(Some(&cache), 1_000_000, true));
    }

    #[test]
    fn is_stale_fresh_cache_not_stale() {
        let cache = make_cache("2026-04-09T00:00:00Z", &[], 1_000_000);
        // 1 hour later — still fresh
        assert!(!is_stale(Some(&cache), 1_000_000 + 3600, false));
    }

    #[test]
    fn is_stale_exactly_24h_is_stale() {
        let cache = make_cache("2026-04-09T00:00:00Z", &[], 1_000_000);
        assert!(is_stale(Some(&cache), 1_000_000 + STALE_AFTER_SECS, false));
    }

    #[test]
    fn is_stale_handles_clock_going_backwards() {
        let cache = make_cache("2026-04-09T00:00:00Z", &[], 1_000_000);
        // Clock moved backwards (e.g. NTP correction). saturating_sub → 0 → not stale.
        assert!(!is_stale(Some(&cache), 999_000, false));
    }

    #[test]
    fn merge_ok_no_cache_persists_fresh() {
        let fresh = make_manifest("2026-04-10T00:00:00Z", &["GE-Proton10-1"]);
        let (result, new_cache) = merge_fetched_with_cache(None, Ok(fresh.clone()), 1_500_000);

        assert!(!result.from_cache);
        assert!(result.error.is_none());
        assert_eq!(result.last_checked_epoch_secs, Some(1_500_000));
        assert_eq!(
            result.manifest.as_ref().unwrap().generated_at,
            "2026-04-10T00:00:00Z"
        );

        let cache = new_cache.expect("should persist");
        assert_eq!(cache.last_checked_epoch_secs, 1_500_000);
        assert_eq!(cache.manifest.generated_at, "2026-04-10T00:00:00Z");
    }

    #[test]
    fn merge_ok_newer_than_cache_replaces() {
        let cached = make_cache("2026-04-01T00:00:00Z", &["GE-Proton9-1"], 1_000_000);
        let fresh = make_manifest("2026-04-10T00:00:00Z", &["GE-Proton10-1"]);
        let (result, new_cache) = merge_fetched_with_cache(Some(cached), Ok(fresh), 1_500_000);

        assert_eq!(
            result.manifest.as_ref().unwrap().releases[0].tag_name,
            "GE-Proton10-1"
        );
        assert_eq!(result.last_checked_epoch_secs, Some(1_500_000));
        assert!(!result.from_cache);
        let cache = new_cache.unwrap();
        assert_eq!(cache.manifest.generated_at, "2026-04-10T00:00:00Z");
        assert_eq!(cache.last_checked_epoch_secs, 1_500_000);
    }

    #[test]
    fn merge_ok_same_or_older_keeps_cache_but_bumps_timestamp() {
        let cached = make_cache("2026-04-10T00:00:00Z", &["GE-Proton10-1"], 1_000_000);
        // Upstream is OLDER than what we have cached (shouldn't happen in practice
        // but we should handle it defensively).
        let older = make_manifest("2026-04-01T00:00:00Z", &["GE-Proton9-1"]);
        let (result, new_cache) = merge_fetched_with_cache(Some(cached), Ok(older), 1_500_000);

        // We keep the cached (newer) manifest
        assert_eq!(
            result.manifest.as_ref().unwrap().releases[0].tag_name,
            "GE-Proton10-1"
        );
        // But bump last_checked so we don't keep retrying within the 24h window
        assert_eq!(result.last_checked_epoch_secs, Some(1_500_000));
        assert!(!result.from_cache);
        let cache = new_cache.unwrap();
        assert_eq!(cache.manifest.generated_at, "2026-04-10T00:00:00Z");
        assert_eq!(cache.last_checked_epoch_secs, 1_500_000);
    }

    #[test]
    fn merge_network_error_falls_back_to_cache_no_write() {
        let cached = make_cache("2026-04-09T00:00:00Z", &["GE-Proton9-27"], 1_000_000);
        let (result, new_cache) =
            merge_fetched_with_cache(Some(cached), Err("HTTP 500".to_string()), 1_500_000);

        assert!(result.from_cache);
        assert_eq!(result.error.as_deref(), Some("HTTP 500"));
        // last_checked is the cached one, NOT now — we didn't successfully check.
        assert_eq!(result.last_checked_epoch_secs, Some(1_000_000));
        assert_eq!(
            result.manifest.as_ref().unwrap().releases[0].tag_name,
            "GE-Proton9-27"
        );
        assert!(new_cache.is_none());
    }

    #[test]
    fn merge_network_error_no_cache_returns_error() {
        let (result, new_cache) =
            merge_fetched_with_cache(None, Err("connection refused".to_string()), 1_500_000);

        assert!(result.manifest.is_none());
        assert_eq!(result.error.as_deref(), Some("connection refused"));
        assert_eq!(result.last_checked_epoch_secs, None);
        assert!(!result.from_cache);
        assert!(new_cache.is_none());
    }

    #[test]
    fn cache_roundtrip_via_disk() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("default.json");
        let cache = make_cache("2026-04-09T00:00:00Z", &["GE-Proton9-27"], 1_234_567);
        save_cache(&path, &cache).unwrap();

        let loaded = load_cache(&path).unwrap();
        assert_eq!(loaded.schema_version, CACHE_SCHEMA_VERSION);
        assert_eq!(loaded.last_checked_epoch_secs, 1_234_567);
        assert_eq!(loaded.manifest.generated_at, "2026-04-09T00:00:00Z");
        assert_eq!(loaded.manifest.releases.len(), 1);
        assert_eq!(loaded.manifest.releases[0].tag_name, "GE-Proton9-27");
    }

    #[test]
    fn load_cache_returns_none_on_wrong_schema_version() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("default.json");
        let json = r#"{
            "schemaVersion": 999,
            "lastCheckedEpochSecs": 1,
            "manifest": { "schemaVersion": 1, "generatedAt": "x", "releases": [] }
        }"#;
        std::fs::write(&path, json).unwrap();
        assert!(load_cache(&path).is_none());
    }

    #[test]
    fn load_cache_returns_none_for_missing_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nope.json");
        assert!(load_cache(&path).is_none());
    }

    #[test]
    fn sanitize_source_id_blocks_path_traversal() {
        assert_eq!(
            sanitize_source_id("../../../etc/passwd"),
            "_________etc_passwd"
        );
        assert_eq!(sanitize_source_id("default"), "default");
        assert_eq!(
            sanitize_source_id("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
            "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        );
    }

    #[test]
    fn merge_dedupes_by_tag_name_first_source_wins() {
        let default = make_source("default", "Proton-GE Official");
        let custom = make_source("custom", "Custom Source");

        let results = vec![
            (
                default,
                make_fetch_result(
                    Some(make_manifest(
                        "2026-04-09T00:00:00Z",
                        &["GE-Proton9-27", "GE-Proton9-26"],
                    )),
                    Some(1_500_000),
                    false,
                    None,
                ),
            ),
            (
                custom,
                make_fetch_result(
                    // duplicate GE-Proton9-27, plus a unique CUSTOM-1
                    Some(make_manifest(
                        "2026-04-09T01:00:00Z",
                        &["GE-Proton9-27", "CUSTOM-1"],
                    )),
                    Some(1_500_050),
                    false,
                    None,
                ),
            ),
        ];

        let merged = merge_sources(results);

        assert_eq!(merged.releases.len(), 3);
        let tags: Vec<_> = merged
            .releases
            .iter()
            .map(|r| r.tag_name.as_str())
            .collect();
        assert_eq!(tags, vec!["GE-Proton9-27", "GE-Proton9-26", "CUSTOM-1"]);

        // First-source wins: GE-Proton9-27 should have the default source's name.
        let ge927 = merged
            .releases
            .iter()
            .find(|r| r.tag_name == "GE-Proton9-27")
            .unwrap();
        assert_eq!(ge927.source_name.as_deref(), Some("Proton-GE Official"));

        assert_eq!(merged.source_status.len(), 2);
        assert!(merged.source_status.iter().all(|s| s.success));
        assert_eq!(merged.source_status[0].release_count, 2);
        assert_eq!(merged.source_status[1].release_count, 2);

        // Top-level last_checked is the most recent (highest) among sources.
        assert_eq!(merged.last_checked_epoch_secs, Some(1_500_050));
    }

    #[test]
    fn merge_reports_partial_failures() {
        let ok_source = make_source("ok", "OK Source");
        let bad_source = make_source("bad", "Bad Source");

        let results = vec![
            (
                ok_source,
                make_fetch_result(
                    Some(make_manifest("2026-04-09T00:00:00Z", &["GE-Proton9-27"])),
                    Some(1_500_000),
                    false,
                    None,
                ),
            ),
            (
                bad_source,
                make_fetch_result(None, None, false, Some("HTTP 404")),
            ),
        ];

        let merged = merge_sources(results);

        assert_eq!(merged.releases.len(), 1);
        assert_eq!(merged.source_status.len(), 2);

        let ok_status = merged
            .source_status
            .iter()
            .find(|s| s.source_name == "OK Source")
            .unwrap();
        assert!(ok_status.success);
        assert_eq!(ok_status.release_count, 1);
        assert!(ok_status.error.is_none());
        assert_eq!(ok_status.last_checked_epoch_secs, Some(1_500_000));

        let bad_status = merged
            .source_status
            .iter()
            .find(|s| s.source_name == "Bad Source")
            .unwrap();
        assert!(!bad_status.success);
        assert_eq!(bad_status.release_count, 0);
        assert_eq!(bad_status.error.as_deref(), Some("HTTP 404"));
        assert_eq!(bad_status.last_checked_epoch_secs, None);
    }

    #[test]
    fn merge_empty_when_all_sources_fail() {
        let a = make_source("a", "A");
        let b = make_source("b", "B");

        let results = vec![
            (
                a,
                make_fetch_result(None, None, false, Some("network down")),
            ),
            (b, make_fetch_result(None, None, false, Some("HTTP 500"))),
        ];

        let merged = merge_sources(results);

        assert!(merged.releases.is_empty());
        assert!(merged.source_status.iter().all(|s| !s.success));
        assert_eq!(merged.source_status.len(), 2);
        assert_eq!(merged.last_checked_epoch_secs, None);
    }

    #[test]
    fn merge_injects_category_from_manifest_onto_releases_and_status() {
        let source = make_source("default", "Proton-GE Official");
        let results = vec![(
            source,
            make_fetch_result(
                Some(make_manifest_with_category(
                    "2026-04-09T00:00:00Z",
                    "GE-Proton",
                    &["GE-Proton10-1"],
                )),
                Some(1_500_000),
                false,
                None,
            ),
        )];

        let merged = merge_sources(results);

        assert_eq!(merged.releases.len(), 1);
        assert_eq!(merged.releases[0].category.as_deref(), Some("GE-Proton"));
        assert_eq!(
            merged.source_status[0].category.as_deref(),
            Some("GE-Proton")
        );
    }

    #[test]
    fn merge_preserves_distinct_categories_across_sources() {
        let ge_source = make_source("default", "Proton-GE Official");
        let wine_source = make_source("wine", "Wine-GE Official");

        let results = vec![
            (
                ge_source,
                make_fetch_result(
                    Some(make_manifest_with_category(
                        "2026-04-09T00:00:00Z",
                        "GE-Proton",
                        &["GE-Proton10-1"],
                    )),
                    Some(1_500_000),
                    false,
                    None,
                ),
            ),
            (
                wine_source,
                make_fetch_result(
                    Some(make_manifest_with_category(
                        "2026-04-09T00:00:00Z",
                        "Wine-GE",
                        &["Wine-GE-Proton8-26"],
                    )),
                    Some(1_500_000),
                    false,
                    None,
                ),
            ),
        ];

        let merged = merge_sources(results);

        let ge = merged
            .releases
            .iter()
            .find(|r| r.tag_name == "GE-Proton10-1")
            .unwrap();
        assert_eq!(ge.category.as_deref(), Some("GE-Proton"));

        let wine = merged
            .releases
            .iter()
            .find(|r| r.tag_name == "Wine-GE-Proton8-26")
            .unwrap();
        assert_eq!(wine.category.as_deref(), Some("Wine-GE"));
    }

    #[test]
    fn merge_surfaces_from_cache_flag_for_stale_served_data() {
        let source = make_source("default", "Proton-GE Official");
        let results = vec![(
            source,
            make_fetch_result(
                Some(make_manifest("2026-04-09T00:00:00Z", &["GE-Proton9-27"])),
                Some(1_000_000),
                true,
                Some("network down"),
            ),
        )];

        let merged = merge_sources(results);

        assert_eq!(merged.releases.len(), 1);
        let status = &merged.source_status[0];
        // We have data (from cache) — success=true in the manifest-is-some sense.
        assert!(status.success);
        assert!(status.from_cache);
        assert_eq!(status.error.as_deref(), Some("network down"));
        assert_eq!(merged.last_checked_epoch_secs, Some(1_000_000));
    }

    #[test]
    fn is_safe_tag_name_valid() {
        assert!(is_safe_tag_name("GE-Proton9-27"));
        assert!(is_safe_tag_name("Proton-9.0-4"));
        assert!(is_safe_tag_name("wine-ge-8-26"));
    }

    #[test]
    fn is_safe_tag_name_rejects_path_traversal() {
        assert!(!is_safe_tag_name(".."));
        assert!(!is_safe_tag_name("../etc/passwd"));
        assert!(!is_safe_tag_name("foo/bar"));
        assert!(!is_safe_tag_name("foo\\bar"));
        assert!(!is_safe_tag_name(""));
        assert!(!is_safe_tag_name("."));
    }
}
