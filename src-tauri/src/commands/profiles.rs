use crate::models::profile::Profile;
use std::path::{Path, PathBuf};

fn profiles_dir() -> PathBuf {
    let config = dirs::config_dir().unwrap_or_else(|| dirs::home_dir().unwrap().join(".config"));
    let dir = config.join("nozomi-launcher/profiles");
    std::fs::create_dir_all(&dir).ok();
    dir
}

pub fn list_profiles_in(dir: &Path) -> Result<Vec<Profile>, String> {
    let mut profiles = Vec::new();

    let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "json") {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(profile) = serde_json::from_str::<Profile>(&content) {
                    profiles.push(profile);
                }
            }
        }
    }

    profiles.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(profiles)
}

pub fn save_profile_in(dir: &Path, profile: &Profile) -> Result<(), String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{}.json", profile.id));
    let content = serde_json::to_string_pretty(profile).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

pub fn delete_profile_in(dir: &Path, id: &str) -> Result<(), String> {
    let path = dir.join(format!("{id}.json"));
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn load_profile_in(dir: &Path, id: &str) -> Result<Profile, String> {
    let path = dir.join(format!("{id}.json"));
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_profiles() -> Result<Vec<Profile>, String> {
    list_profiles_in(&profiles_dir())
}

#[tauri::command]
pub fn save_profile(profile: Profile) -> Result<Profile, String> {
    save_profile_in(&profiles_dir(), &profile)?;
    Ok(profile)
}

#[tauri::command]
pub fn delete_profile(id: String) -> Result<(), String> {
    delete_profile_in(&profiles_dir(), &id)
}

#[tauri::command]
pub fn load_profile(id: String) -> Result<Profile, String> {
    load_profile_in(&profiles_dir(), &id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::profile::EnvVar;
    use std::fs;

    fn temp_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("nozomi-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn sample_profile(id: &str, name: &str) -> Profile {
        Profile {
            id: id.to_string(),
            name: name.to_string(),
            env_vars: vec![EnvVar {
                key: "MANGOHUD".to_string(),
                value: "1".to_string(),
                enabled: true,
            }],
            proton_version: Some("GE-Proton9-1".to_string()),
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn save_and_load_profile() {
        let dir = temp_dir();
        let profile = sample_profile("abc-123", "Test Profile");

        save_profile_in(&dir, &profile).unwrap();
        let loaded = load_profile_in(&dir, "abc-123").unwrap();

        assert_eq!(loaded.id, "abc-123");
        assert_eq!(loaded.name, "Test Profile");
        assert_eq!(loaded.env_vars.len(), 1);
        assert_eq!(loaded.proton_version, Some("GE-Proton9-1".to_string()));

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_profiles_sorted_by_name() {
        let dir = temp_dir();

        save_profile_in(&dir, &sample_profile("z-id", "Zelda Config")).unwrap();
        save_profile_in(&dir, &sample_profile("a-id", "Arch Config")).unwrap();
        save_profile_in(&dir, &sample_profile("m-id", "Modded Config")).unwrap();

        let profiles = list_profiles_in(&dir).unwrap();
        let names: Vec<&str> = profiles.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["Arch Config", "Modded Config", "Zelda Config"]);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn delete_profile_removes_file() {
        let dir = temp_dir();
        let profile = sample_profile("del-me", "Delete Me");

        save_profile_in(&dir, &profile).unwrap();
        assert!(dir.join("del-me.json").exists());

        delete_profile_in(&dir, "del-me").unwrap();
        assert!(!dir.join("del-me.json").exists());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn delete_nonexistent_profile_is_ok() {
        let dir = temp_dir();
        let result = delete_profile_in(&dir, "does-not-exist");
        assert!(result.is_ok());
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn load_nonexistent_profile_is_err() {
        let dir = temp_dir();
        let result = load_profile_in(&dir, "nope");
        assert!(result.is_err());
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_empty_dir() {
        let dir = temp_dir();
        let profiles = list_profiles_in(&dir).unwrap();
        assert!(profiles.is_empty());
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_ignores_non_json_files() {
        let dir = temp_dir();
        fs::write(dir.join("readme.txt"), "not a profile").unwrap();
        save_profile_in(&dir, &sample_profile("real", "Real")).unwrap();

        let profiles = list_profiles_in(&dir).unwrap();
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].name, "Real");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_ignores_malformed_json() {
        let dir = temp_dir();
        fs::write(dir.join("bad.json"), "{ not valid json }").unwrap();
        save_profile_in(&dir, &sample_profile("good", "Good")).unwrap();

        let profiles = list_profiles_in(&dir).unwrap();
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].name, "Good");

        fs::remove_dir_all(&dir).ok();
    }
}
