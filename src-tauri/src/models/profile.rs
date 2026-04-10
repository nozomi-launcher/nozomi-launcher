use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EnvVar {
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub env_vars: Vec<EnvVar>,
    pub proton_version: Option<String>,
    /// Steam app ID this profile is associated with. When set, the profile
    /// auto-applies on launch for the matching game.
    #[serde(default)]
    pub steam_app_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_profile() -> Profile {
        Profile {
            id: "test-id".to_string(),
            name: "My Profile".to_string(),
            env_vars: vec![EnvVar {
                key: "DXVK_HUD".to_string(),
                value: "fps".to_string(),
                enabled: true,
            }],
            proton_version: Some("GE-Proton9-1".to_string()),
            steam_app_id: Some("620".to_string()),
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn serialize_uses_camel_case() {
        let profile = sample_profile();
        let json = serde_json::to_string(&profile).unwrap();
        assert!(json.contains("envVars"));
        assert!(json.contains("protonVersion"));
        assert!(json.contains("steamAppId"));
        assert!(json.contains("createdAt"));
        assert!(!json.contains("env_vars"));
        assert!(!json.contains("proton_version"));
        assert!(!json.contains("steam_app_id"));
    }

    #[test]
    fn roundtrip_serialization() {
        let profile = sample_profile();
        let json = serde_json::to_string_pretty(&profile).unwrap();
        let deserialized: Profile = serde_json::from_str(&json).unwrap();
        assert_eq!(profile, deserialized);
    }

    #[test]
    fn deserialize_null_proton_version() {
        let json = r#"{
            "id": "test",
            "name": "Native",
            "envVars": [],
            "protonVersion": null,
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z"
        }"#;
        let profile: Profile = serde_json::from_str(json).unwrap();
        assert!(profile.proton_version.is_none());
        assert!(profile.steam_app_id.is_none());
        assert_eq!(profile.env_vars.len(), 0);
    }

    #[test]
    fn deserialize_missing_steam_app_id_defaults_to_none() {
        // Existing profiles on disk won't have steamAppId; ensure they load.
        let json = r#"{
            "id": "legacy",
            "name": "Legacy Profile",
            "envVars": [],
            "protonVersion": "GE-Proton9-1",
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z"
        }"#;
        let profile: Profile = serde_json::from_str(json).unwrap();
        assert!(profile.steam_app_id.is_none());
    }
}
