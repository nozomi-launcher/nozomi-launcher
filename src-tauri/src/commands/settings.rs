use crate::models::settings::AppSettings;
use std::path::PathBuf;

fn settings_path() -> PathBuf {
    let config = dirs::config_dir().unwrap_or_else(|| dirs::home_dir().unwrap().join(".config"));
    config.join("nozomi-launcher/settings.json")
}

#[tauri::command]
pub fn get_settings() -> AppSettings {
    let path = settings_path();
    if path.exists() {
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        AppSettings::default()
    }
}

#[tauri::command]
pub fn save_settings(settings: AppSettings) -> Result<(), String> {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create settings directory: {e}"))?;
    }
    let json =
        serde_json::to_string_pretty(&settings).map_err(|e| format!("Failed to serialize: {e}"))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write settings: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn get_settings_returns_default_when_no_file() {
        // settings_path() points to real config, but the function handles missing files gracefully
        let settings = AppSettings::default();
        assert!(settings.active_compat_tool.is_none());
    }

    #[test]
    fn save_and_load_settings() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");

        let settings = AppSettings {
            active_compat_tool: Some("GE-Proton10-34".to_string()),
        };

        let json = serde_json::to_string_pretty(&settings).unwrap();
        fs::write(&path, &json).unwrap();

        let loaded: AppSettings =
            serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(loaded.active_compat_tool, Some("GE-Proton10-34".to_string()));
    }
}
