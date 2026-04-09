use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    /// The globally active compatibility tool version name (e.g. "GE-Proton10-34")
    pub active_compat_tool: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_has_no_compat_tool() {
        let settings = AppSettings::default();
        assert!(settings.active_compat_tool.is_none());
    }

    #[test]
    fn serde_roundtrip() {
        let settings = AppSettings {
            active_compat_tool: Some("GE-Proton10-34".to_string()),
        };
        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: AppSettings = serde_json::from_str(&json).unwrap();
        assert_eq!(settings, deserialized);
    }

    #[test]
    fn serializes_camel_case() {
        let settings = AppSettings {
            active_compat_tool: Some("GE-Proton10-34".to_string()),
        };
        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("activeCompatTool"));
        assert!(!json.contains("active_compat_tool"));
    }
}
