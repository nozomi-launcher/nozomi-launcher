use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CompatToolSource {
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
    /// User-configured extra compat-tool manifest sources (default source is
    /// not stored here). Accepts the legacy `protonManifestSources` key from
    /// settings files written before the rename.
    #[serde(default, alias = "protonManifestSources")]
    pub compat_tool_sources: Vec<CompatToolSource>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_has_no_compat_tool() {
        let settings = AppSettings::default();
        assert!(settings.active_compat_tool.is_none());
        assert!(settings.compat_tool_sources.is_empty());
    }

    #[test]
    fn serde_roundtrip() {
        let settings = AppSettings {
            active_compat_tool: Some("GE-Proton10-34".to_string()),
            compat_tool_sources: vec![CompatToolSource {
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
            compat_tool_sources: vec![],
        };
        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("activeCompatTool"));
        assert!(json.contains("compatToolSources"));
        assert!(!json.contains("active_compat_tool"));
        assert!(!json.contains("compat_tool_sources"));
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
        assert!(settings.compat_tool_sources.is_empty());
    }

    #[test]
    fn fully_empty_legacy_settings_deserializes() {
        let legacy_json = r#"{}"#;
        let settings: AppSettings = serde_json::from_str(legacy_json).unwrap();
        assert!(settings.active_compat_tool.is_none());
        assert!(settings.compat_tool_sources.is_empty());
    }

    #[test]
    fn legacy_proton_manifest_sources_field_deserializes_via_alias() {
        // Users who wrote settings.json with the pre-rename key must still
        // have their sources loaded correctly.
        let legacy_json = r#"{
            "activeCompatTool": "GE-Proton10-34",
            "protonManifestSources": [
                { "id": "cachy", "name": "CachyOS Proton", "url": "https://example.com/cachy.json", "enabled": true }
            ]
        }"#;
        let settings: AppSettings = serde_json::from_str(legacy_json).unwrap();
        assert_eq!(settings.compat_tool_sources.len(), 1);
        assert_eq!(settings.compat_tool_sources[0].id, "cachy");
    }
}
