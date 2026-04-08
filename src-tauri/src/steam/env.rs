use std::path::PathBuf;

/// Get the Steam root directory.
/// Checks common locations: ~/.steam/root, ~/.local/share/Steam
pub fn steam_root() -> Option<PathBuf> {
    let home = dirs::home_dir()?;

    let candidates = [
        home.join(".steam/root"),
        home.join(".local/share/Steam"),
    ];

    candidates.into_iter().find(|p| p.exists())
}

/// Get the compatibility tools directory where tools like Proton are installed.
pub fn compat_tools_dir() -> Option<PathBuf> {
    let root = steam_root()?;
    let dir = root.join("compatibilitytools.d");
    if dir.exists() { Some(dir) } else { None }
}

/// Get Steam library folder paths from libraryfolders.vdf.
/// Returns the steamapps directories.
pub fn steam_library_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    if let Some(root) = steam_root() {
        let steamapps = root.join("steamapps");
        if steamapps.exists() {
            dirs.push(steamapps);
        }

        // Parse libraryfolders.vdf for additional library paths
        let vdf_path = root.join("steamapps/libraryfolders.vdf");
        if let Ok(content) = std::fs::read_to_string(&vdf_path) {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("\"path\"") {
                    if let Some(path_str) = extract_vdf_value(trimmed) {
                        let lib_path = PathBuf::from(path_str).join("steamapps");
                        if lib_path.exists() && !dirs.contains(&lib_path) {
                            dirs.push(lib_path);
                        }
                    }
                }
            }
        }
    }

    dirs
}

pub(crate) fn extract_vdf_value(line: &str) -> Option<&str> {
    let mut parts = line.splitn(2, "\"path\"");
    parts.next()?;
    let rest = parts.next()?.trim();
    let rest = rest.trim_start_matches('"').trim_start();
    let rest = rest.trim_start_matches('"');
    let end = rest.find('"')?;
    Some(&rest[..end])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_vdf_path_standard_format() {
        let line = r#"		"path"		"/mnt/games/SteamLibrary""#;
        assert_eq!(extract_vdf_value(line), Some("/mnt/games/SteamLibrary"));
    }

    #[test]
    fn extract_vdf_path_compact_format() {
        let line = r#""path" "/home/user/.steam""#;
        assert_eq!(extract_vdf_value(line), Some("/home/user/.steam"));
    }

    #[test]
    fn extract_vdf_no_path_key() {
        let line = r#"		"label"		"SteamLibrary""#;
        assert_eq!(extract_vdf_value(line), None);
    }

    #[test]
    fn extract_vdf_empty_value_returns_none() {
        // An empty path value `""` is not a valid library path
        let line = r#""path" """#;
        assert_eq!(extract_vdf_value(line), None);
    }
}
