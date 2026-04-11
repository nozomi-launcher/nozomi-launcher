use crate::models::settings::AppSettings;
use std::path::{Path, PathBuf};

fn settings_path() -> Result<PathBuf, String> {
    let config = dirs::config_dir()
        .or_else(|| dirs::home_dir().map(|h| h.join(".config")))
        .ok_or_else(|| "Could not determine config directory: HOME is not set".to_string())?;
    Ok(config.join("nozomi-launcher/settings.json"))
}

fn get_settings_from(path: &Path) -> Result<AppSettings, String> {
    if path.exists() {
        Ok(std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default())
    } else {
        Ok(AppSettings::default())
    }
}

fn save_settings_to(path: &Path, settings: &AppSettings) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create settings directory: {e}"))?;
    }
    let json =
        serde_json::to_string_pretty(settings).map_err(|e| format!("Failed to serialize: {e}"))?;
    std::fs::write(path, json).map_err(|e| format!("Failed to write settings: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn get_settings() -> Result<AppSettings, String> {
    get_settings_from(&settings_path()?)
}

#[tauri::command]
pub fn save_settings(settings: AppSettings) -> Result<(), String> {
    save_settings_to(&settings_path()?, &settings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_settings_returns_default_when_no_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        let settings = get_settings_from(&path).unwrap();
        assert!(settings.active_compat_tool.is_none());
    }

    #[test]
    fn save_and_load_settings_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");

        let settings = AppSettings {
            active_compat_tool: Some("GE-Proton10-34".to_string()),
            proton_manifest_sources: vec![],
        };
        save_settings_to(&path, &settings).unwrap();
        let loaded = get_settings_from(&path).unwrap();
        assert_eq!(
            loaded.active_compat_tool,
            Some("GE-Proton10-34".to_string())
        );
    }

    #[test]
    fn save_creates_parent_directories() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested/deep/settings.json");

        let settings = AppSettings {
            active_compat_tool: None,
            proton_manifest_sources: vec![],
        };
        save_settings_to(&path, &settings).unwrap();
        assert!(path.exists());
    }

    #[test]
    fn get_settings_returns_default_for_malformed_json() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        std::fs::write(&path, "not valid json").unwrap();
        let settings = get_settings_from(&path).unwrap();
        assert!(settings.active_compat_tool.is_none());
    }
}
