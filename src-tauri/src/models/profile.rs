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
            env_vars: vec![
                EnvVar {
                    key: "DXVK_HUD".to_string(),
                    value: "fps".to_string(),
                    enabled: true,
                },
            ],
            proton_version: Some("GE-Proton9-1".to_string()),
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
        assert!(json.contains("createdAt"));
        assert!(!json.contains("env_vars"));
        assert!(!json.contains("proton_version"));
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
        assert_eq!(profile.env_vars.len(), 0);
    }
}
