use serde::{Deserialize, Serialize};

use crate::commands::settings::get_settings;
use crate::steam::env;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtonVersion {
    pub name: String,
    pub path: String,
}

/// Resolve the custom compat tools directory from settings, if any.
fn custom_compat_dir() -> Option<PathBuf> {
    let settings = get_settings().ok()?;
    let dir_str = settings.compat_tools_dir.as_deref().filter(|s| !s.is_empty())?;
    let path = PathBuf::from(dir_str);
    if path.is_dir() {
        Some(path)
    } else {
        None
    }
}

#[tauri::command]
pub fn list_proton_versions() -> Vec<ProtonVersion> {
    let mut versions = Vec::new();

    // Check custom override or default compatibilitytools.d for custom Proton installs
    let compat_dir = custom_compat_dir().or_else(|| env::compat_tools_dir());
    if let Some(compat_dir) = compat_dir {
        if let Ok(entries) = std::fs::read_dir(&compat_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() && has_proton_executable(&path) {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        versions.push(ProtonVersion {
                            name: name.to_string(),
                            path: path.to_string_lossy().to_string(),
                        });
                    }
                }
            }
        }
    }

    // Check Steam library dirs for official Proton installs
    for lib_dir in env::steam_library_dirs() {
        let common = lib_dir.join("common");
        if let Ok(entries) = std::fs::read_dir(&common) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() && has_proton_executable(&path) {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        if !versions.iter().any(|v| v.name == name) {
                            versions.push(ProtonVersion {
                                name: name.to_string(),
                                path: path.to_string_lossy().to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    versions.sort_by(|a, b| b.name.cmp(&a.name));
    versions
}

fn has_proton_executable(dir: &std::path::Path) -> bool {
    dir.join("proton").exists()
}
