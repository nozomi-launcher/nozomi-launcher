use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::steam::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtonVersion {
    pub name: String,
    pub path: String,
}

#[tauri::command]
pub fn list_proton_versions() -> Vec<ProtonVersion> {
    let mut versions = Vec::new();

    // Check compatibilitytools.d for custom Proton installs (GE-Proton, etc.)
    if let Some(compat_dir) = env::compat_tools_dir() {
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

fn has_proton_executable(dir: &PathBuf) -> bool {
    dir.join("proton").exists()
}
