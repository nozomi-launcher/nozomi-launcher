use crate::commands::settings::get_settings;
use crate::models::proton_ge::{
    FetchReleasesResult, ProtonGeManifest, ProtonGeRelease, SourceStatus,
};
use crate::models::settings::ProtonManifestSource;
use std::collections::HashSet;
use std::time::Duration;

pub const DEFAULT_MANIFEST_URL: &str =
    "https://raw.githubusercontent.com/nozomi-launcher/nozomi-launcher/main/manifests/proton-ge.json";
pub const DEFAULT_MANIFEST_NAME: &str = "Proton-GE Official";
const REQUEST_TIMEOUT_SECS: u64 = 30;

fn default_source() -> ProtonManifestSource {
    ProtonManifestSource {
        id: "default".to_string(),
        name: DEFAULT_MANIFEST_NAME.to_string(),
        url: DEFAULT_MANIFEST_URL.to_string(),
        enabled: true,
    }
}

async fn fetch_one(
    client: &reqwest::Client,
    source: &ProtonManifestSource,
) -> Result<Vec<ProtonGeRelease>, String> {
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

    let manifest: ProtonGeManifest = response
        .json()
        .await
        .map_err(|e| format!("Invalid manifest JSON: {e}"))?;

    Ok(manifest
        .releases
        .into_iter()
        .map(|mut r| {
            r.source_name = Some(source.name.clone());
            r
        })
        .collect())
}

/// Pure merge function: takes per-source fetch results, dedupes by tag name
/// (first source wins), and builds structured status. Separate from
/// `fetch_proton_ge_releases` so it can be unit-tested without HTTP.
pub fn merge_sources(
    results: Vec<(ProtonManifestSource, Result<Vec<ProtonGeRelease>, String>)>,
) -> FetchReleasesResult {
    let mut all_releases: Vec<ProtonGeRelease> = Vec::new();
    let mut seen_tags: HashSet<String> = HashSet::new();
    let mut source_status: Vec<SourceStatus> = Vec::new();

    for (source, result) in results {
        match result {
            Ok(releases) => {
                let count = releases.len();
                for release in releases {
                    if seen_tags.insert(release.tag_name.clone()) {
                        all_releases.push(release);
                    }
                }
                source_status.push(SourceStatus {
                    source_name: source.name,
                    url: source.url,
                    success: true,
                    release_count: count,
                    error: None,
                });
            }
            Err(e) => {
                source_status.push(SourceStatus {
                    source_name: source.name,
                    url: source.url,
                    success: false,
                    release_count: 0,
                    error: Some(e),
                });
            }
        }
    }

    FetchReleasesResult {
        releases: all_releases,
        source_status,
    }
}

#[tauri::command]
pub async fn fetch_proton_ge_releases() -> Result<FetchReleasesResult, String> {
    let settings = get_settings()?;

    // Default source is always first so it wins dedupe ties.
    let mut sources = vec![default_source()];
    sources.extend(
        settings
            .proton_manifest_sources
            .into_iter()
            .filter(|s| s.enabled),
    );

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let fetches = sources.iter().map(|s| fetch_one(&client, s));
    let fetch_results = futures::future::join_all(fetches).await;

    let paired: Vec<(ProtonManifestSource, Result<Vec<ProtonGeRelease>, String>)> =
        sources.into_iter().zip(fetch_results).collect();

    let merged = merge_sources(paired);

    // Hard error only when literally every source failed
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

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_manifest_json() -> &'static str {
        r#"{
            "schemaVersion": 1,
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

    fn make_source(id: &str, name: &str) -> ProtonManifestSource {
        ProtonManifestSource {
            id: id.to_string(),
            name: name.to_string(),
            url: format!("https://example.com/{id}.json"),
            enabled: true,
        }
    }

    fn make_release(tag: &str, source_name: Option<&str>) -> ProtonGeRelease {
        ProtonGeRelease {
            tag_name: tag.to_string(),
            published_at: "2026-04-01T12:00:00Z".to_string(),
            download_url: format!("https://example.com/{tag}.tar.gz"),
            asset_size: 1000,
            source_name: source_name.map(|s| s.to_string()),
        }
    }

    #[test]
    fn manifest_deserializes_releases() {
        let manifest: ProtonGeManifest = serde_json::from_str(sample_manifest_json()).unwrap();
        assert_eq!(manifest.schema_version, 1);
        assert_eq!(manifest.releases.len(), 2);
        assert_eq!(manifest.releases[0].tag_name, "GE-Proton9-27");
        assert_eq!(manifest.releases[0].asset_size, 400000000);
        assert!(manifest.releases[0].download_url.ends_with(".tar.gz"));
    }

    #[test]
    fn manifest_ignores_unknown_fields() {
        let json = r#"{
            "schemaVersion": 1,
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
        let manifest: ProtonGeManifest = serde_json::from_str(json).unwrap();
        assert_eq!(manifest.releases.len(), 1);
    }

    #[test]
    fn proton_ge_release_serde_roundtrip() {
        let release = ProtonGeRelease {
            tag_name: "GE-Proton9-27".to_string(),
            published_at: "2026-04-01T12:00:00Z".to_string(),
            download_url: "https://example.com/GE-Proton9-27.tar.gz".to_string(),
            asset_size: 400000000,
            source_name: None,
        };

        let json = serde_json::to_string(&release).unwrap();
        let deserialized: ProtonGeRelease = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.tag_name, "GE-Proton9-27");
        assert_eq!(deserialized.asset_size, 400000000);

        assert!(json.contains("tagName"));
        assert!(json.contains("publishedAt"));
        assert!(json.contains("downloadUrl"));
        assert!(json.contains("assetSize"));
    }

    #[test]
    fn merge_dedupes_by_tag_name_first_source_wins() {
        let default = make_source("default", "Proton-GE Official");
        let custom = make_source("custom", "Custom Source");

        let results = vec![
            (
                default,
                Ok(vec![
                    make_release("GE-Proton9-27", Some("Proton-GE Official")),
                    make_release("GE-Proton9-26", Some("Proton-GE Official")),
                ]),
            ),
            (
                custom,
                Ok(vec![
                    // duplicate — should be skipped
                    make_release("GE-Proton9-27", Some("Custom Source")),
                    // unique
                    make_release("CUSTOM-1", Some("Custom Source")),
                ]),
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

        // First-source wins: the GE-Proton9-27 kept should be the one tagged "Proton-GE Official"
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
    }

    #[test]
    fn merge_reports_partial_failures() {
        let ok_source = make_source("ok", "OK Source");
        let bad_source = make_source("bad", "Bad Source");

        let results = vec![
            (
                ok_source,
                Ok(vec![make_release("GE-Proton9-27", Some("OK Source"))]),
            ),
            (bad_source, Err("HTTP 404".to_string())),
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

        let bad_status = merged
            .source_status
            .iter()
            .find(|s| s.source_name == "Bad Source")
            .unwrap();
        assert!(!bad_status.success);
        assert_eq!(bad_status.release_count, 0);
        assert_eq!(bad_status.error.as_deref(), Some("HTTP 404"));
    }

    #[test]
    fn merge_empty_when_all_sources_fail() {
        let a = make_source("a", "A");
        let b = make_source("b", "B");

        let results: Vec<(ProtonManifestSource, Result<Vec<ProtonGeRelease>, String>)> = vec![
            (a, Err("network down".to_string())),
            (b, Err("HTTP 500".to_string())),
        ];

        let merged = merge_sources(results);

        assert!(merged.releases.is_empty());
        assert!(merged.source_status.iter().all(|s| !s.success));
        assert_eq!(merged.source_status.len(), 2);
    }

    #[test]
    fn merge_preserves_source_name_on_releases() {
        let source = make_source("only", "Only Source");
        let results = vec![(
            source,
            Ok(vec![make_release("GE-Proton9-27", Some("Only Source"))]),
        )];

        let merged = merge_sources(results);

        assert_eq!(merged.releases.len(), 1);
        assert_eq!(
            merged.releases[0].source_name.as_deref(),
            Some("Only Source")
        );
    }
}
