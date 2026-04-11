use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProtonManifestSource {
    pub id: String,
    pub name: String,
    pub url: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    /// The globally active compatibility tool version name (e.g. "GE-Proton10-34")
    pub active_compat_tool: Option<String>,
    /// User-configured extra Proton manifest sources (default source is not stored here).
    #[serde(default)]
    pub proton_manifest_sources: Vec<ProtonManifestSource>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_has_no_compat_tool() {
        let settings = AppSettings::default();
        assert!(settings.active_compat_tool.is_none());
        assert!(settings.proton_manifest_sources.is_empty());
    }

    #[test]
    fn serde_roundtrip() {
        let settings = AppSettings {
            active_compat_tool: Some("GE-Proton10-34".to_string()),
            proton_manifest_sources: vec![ProtonManifestSource {
                id: "cachy".to_string(),
                name: "CachyOS Proton".to_string(),
                url: "https://example.com/cachy.json".to_string(),
                enabled: true,
            }],
        };
        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: AppSettings = serde_json::from_str(&json).unwrap();
        assert_eq!(settings, deserialized);
    }

    #[test]
    fn serializes_camel_case() {
        let settings = AppSettings {
            active_compat_tool: Some("GE-Proton10-34".to_string()),
            proton_manifest_sources: vec![],
        };
        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("activeCompatTool"));
        assert!(json.contains("protonManifestSources"));
        assert!(!json.contains("active_compat_tool"));
        assert!(!json.contains("proton_manifest_sources"));
    }

    #[test]
    fn legacy_settings_without_sources_field_deserializes() {
        // Legacy settings.json written before manifest sources existed
        let legacy_json = r#"{"activeCompatTool": "GE-Proton10-34"}"#;
        let settings: AppSettings = serde_json::from_str(legacy_json).unwrap();
        assert_eq!(
            settings.active_compat_tool,
            Some("GE-Proton10-34".to_string())
        );
        assert!(settings.proton_manifest_sources.is_empty());
    }

    #[test]
    fn fully_empty_legacy_settings_deserializes() {
        let legacy_json = r#"{}"#;
        let settings: AppSettings = serde_json::from_str(legacy_json).unwrap();
        assert!(settings.active_compat_tool.is_none());
        assert!(settings.proton_manifest_sources.is_empty());
    }
}
