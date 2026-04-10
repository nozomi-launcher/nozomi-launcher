use crate::models::proton_ge::ProtonGeRelease;
use std::time::Duration;

const RELEASES_URL: &str =
    "https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases?per_page=100";
const REQUEST_TIMEOUT_SECS: u64 = 30;

#[tauri::command]
pub async fn fetch_proton_ge_releases() -> Result<Vec<ProtonGeRelease>, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;
    let response = client
        .get(RELEASES_URL)
        .header("User-Agent", "nozomi-launcher")
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                format!(
                    "Request to GitHub timed out after {REQUEST_TIMEOUT_SECS} seconds. Please try again."
                )
            } else {
                format!("Failed to fetch releases: {e}")
            }
        })?;

    if !response.status().is_success() {
        return Err(format!("GitHub API returned status {}", response.status()));
    }

    let json: Vec<serde_json::Value> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))?;

    Ok(parse_releases(&json))
}

pub fn parse_releases(releases: &[serde_json::Value]) -> Vec<ProtonGeRelease> {
    releases
        .iter()
        .filter_map(|release| {
            let tag_name = release.get("tag_name")?.as_str()?.to_string();
            let published_at = release.get("published_at")?.as_str()?.to_string();

            let assets = release.get("assets")?.as_array()?;
            let tar_asset = assets.iter().find(|a| {
                a.get("name")
                    .and_then(|n| n.as_str())
                    .is_some_and(|n| n.ends_with(".tar.gz"))
            })?;

            let download_url = tar_asset.get("browser_download_url")?.as_str()?.to_string();
            let asset_size = tar_asset.get("size")?.as_u64()?;

            Some(ProtonGeRelease {
                tag_name,
                published_at,
                download_url,
                asset_size,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_release_json() -> Vec<serde_json::Value> {
        serde_json::from_str(
            r#"[
                {
                    "tag_name": "GE-Proton9-27",
                    "published_at": "2026-04-01T12:00:00Z",
                    "assets": [
                        {
                            "name": "GE-Proton9-27.tar.gz",
                            "browser_download_url": "https://github.com/GloriousEggroll/proton-ge-custom/releases/download/GE-Proton9-27/GE-Proton9-27.tar.gz",
                            "size": 400000000
                        },
                        {
                            "name": "GE-Proton9-27.sha512sum",
                            "browser_download_url": "https://github.com/GloriousEggroll/proton-ge-custom/releases/download/GE-Proton9-27/GE-Proton9-27.sha512sum",
                            "size": 128
                        }
                    ]
                },
                {
                    "tag_name": "GE-Proton9-26",
                    "published_at": "2026-03-15T10:00:00Z",
                    "assets": [
                        {
                            "name": "GE-Proton9-26.tar.gz",
                            "browser_download_url": "https://github.com/GloriousEggroll/proton-ge-custom/releases/download/GE-Proton9-26/GE-Proton9-26.tar.gz",
                            "size": 390000000
                        }
                    ]
                },
                {
                    "tag_name": "GE-Proton9-25",
                    "published_at": "2026-02-20T08:00:00Z",
                    "assets": []
                }
            ]"#,
        )
        .unwrap()
    }

    #[test]
    fn test_parse_releases_extracts_tar_gz_assets() {
        let releases = parse_releases(&sample_release_json());

        assert_eq!(releases.len(), 2);
        assert_eq!(releases[0].tag_name, "GE-Proton9-27");
        assert_eq!(releases[0].asset_size, 400000000);
        assert!(releases[0].download_url.ends_with(".tar.gz"));
        assert_eq!(releases[1].tag_name, "GE-Proton9-26");
    }

    #[test]
    fn test_parse_releases_skips_entries_without_tar_gz() {
        let releases = parse_releases(&sample_release_json());

        // GE-Proton9-25 has no .tar.gz asset, should be skipped
        assert!(!releases.iter().any(|r| r.tag_name == "GE-Proton9-25"));
    }

    #[test]
    fn test_parse_releases_empty_input() {
        let releases = parse_releases(&[]);
        assert!(releases.is_empty());
    }

    #[test]
    fn test_proton_ge_release_serde_roundtrip() {
        let release = ProtonGeRelease {
            tag_name: "GE-Proton9-27".to_string(),
            published_at: "2026-04-01T12:00:00Z".to_string(),
            download_url: "https://example.com/GE-Proton9-27.tar.gz".to_string(),
            asset_size: 400000000,
        };

        let json = serde_json::to_string(&release).unwrap();
        let deserialized: ProtonGeRelease = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.tag_name, "GE-Proton9-27");
        assert_eq!(deserialized.asset_size, 400000000);

        // Verify camelCase serialization
        assert!(json.contains("tagName"));
        assert!(json.contains("publishedAt"));
        assert!(json.contains("downloadUrl"));
        assert!(json.contains("assetSize"));
    }
}
