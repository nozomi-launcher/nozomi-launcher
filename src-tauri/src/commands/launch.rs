use crate::models::profile::EnvVar;
use std::io::Write;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchOptions {
    pub game_path: String,
    pub env_vars: Vec<EnvVar>,
    pub proton_path: Option<String>,
}

/// Shell-quote a string using single quotes (POSIX-safe).
fn shell_quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}

/// Validate that an environment variable key is a legal shell identifier.
fn is_valid_env_key(key: &str) -> bool {
    if key.is_empty() {
        return false;
    }
    let mut chars = key.chars();
    match chars.next() {
        Some(c) if c.is_ascii_alphabetic() || c == '_' => {}
        _ => return false,
    }
    chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

/// Build the wrapper shell script that launches the game via Proton and runs
/// post-game routines after the game exits.
fn build_wrapper_script(options: &LaunchOptions) -> Result<String, String> {
    let proton_path = options
        .proton_path
        .as_deref()
        .ok_or("No proton path provided")?;

    let mut script = String::from("#!/bin/bash\n\n");

    // Export user-defined environment variables
    for env_var in &options.env_vars {
        if env_var.enabled {
            if !is_valid_env_key(&env_var.key) {
                return Err(format!("Invalid environment variable key: {}", env_var.key));
            }
            script.push_str(&format!(
                "export {}={}\n",
                env_var.key,
                shell_quote(&env_var.value)
            ));
        }
    }

    // Launch the game via proton
    script.push_str(&format!(
        "\n{}/proton waitforexitandrun {}\n",
        shell_quote(proton_path),
        shell_quote(&options.game_path),
    ));
    script.push_str("GAME_EXIT_CODE=$?\n\n");

    // Post-game routines (to be determined)
    script.push_str("# Post-game routines will be added here\n\n");

    script.push_str("exit $GAME_EXIT_CODE\n");

    Ok(script)
}

/// Replace the current process with the wrapper script (Unix only).
#[cfg(unix)]
fn exec_wrapper(wrapper_path: &std::path::Path) -> Result<(), String> {
    use std::os::unix::process::CommandExt;
    let err = std::process::Command::new("/bin/bash")
        .arg(wrapper_path)
        .exec();
    Err(format!("Failed to exec game wrapper: {}", err))
}

#[cfg(not(unix))]
fn exec_wrapper(_wrapper_path: &std::path::Path) -> Result<(), String> {
    Err("Game launching via exec is only supported on Unix systems".to_string())
}

#[tauri::command]
pub async fn launch_game(options: LaunchOptions) -> Result<(), String> {
    let script = build_wrapper_script(&options)?;

    // Write wrapper script to a temporary file unique to this process
    let wrapper_path = std::env::temp_dir().join(format!(
        "nozomi-wrapper-{}.sh",
        std::process::id()
    ));
    {
        let mut file = std::fs::File::create(&wrapper_path).map_err(|e| e.to_string())?;
        file.write_all(script.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&wrapper_path, std::fs::Permissions::from_mode(0o700))
            .map_err(|e| e.to_string())?;
    }

    // exec replaces the current process with the wrapper script
    exec_wrapper(&wrapper_path)
}

#[tauri::command]
pub async fn abort_launch(app_handle: tauri::AppHandle) -> Result<(), String> {
    app_handle.exit(0);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shell_quote_simple() {
        assert_eq!(shell_quote("hello"), "'hello'");
    }

    #[test]
    fn shell_quote_with_single_quotes() {
        assert_eq!(shell_quote("it's"), "'it'\\''s'");
    }

    #[test]
    fn shell_quote_with_spaces() {
        assert_eq!(shell_quote("hello world"), "'hello world'");
    }

    #[test]
    fn shell_quote_with_special_chars() {
        assert_eq!(shell_quote("$HOME/path"), "'$HOME/path'");
    }

    #[test]
    fn valid_env_key_alphanumeric() {
        assert!(is_valid_env_key("DXVK_HUD"));
        assert!(is_valid_env_key("_PRIVATE"));
        assert!(is_valid_env_key("key123"));
    }

    #[test]
    fn invalid_env_key_starts_with_digit() {
        assert!(!is_valid_env_key("123abc"));
    }

    #[test]
    fn invalid_env_key_empty() {
        assert!(!is_valid_env_key(""));
    }

    #[test]
    fn invalid_env_key_special_chars() {
        assert!(!is_valid_env_key("MY-VAR"));
        assert!(!is_valid_env_key("MY VAR"));
        assert!(!is_valid_env_key("MY.VAR"));
    }

    #[test]
    fn build_script_with_proton_and_env_vars() {
        let options = LaunchOptions {
            game_path: "/path/to/game.exe".to_string(),
            env_vars: vec![
                EnvVar {
                    key: "DXVK_HUD".to_string(),
                    value: "fps".to_string(),
                    enabled: true,
                },
                EnvVar {
                    key: "DISABLED".to_string(),
                    value: "nope".to_string(),
                    enabled: false,
                },
            ],
            proton_path: Some("/home/user/.steam/root/compatibilitytools.d/GE-Proton9-1".to_string()),
        };
        let script = build_wrapper_script(&options).unwrap();
        assert!(script.contains("#!/bin/bash"));
        assert!(script.contains("export DXVK_HUD='fps'"));
        assert!(!script.contains("DISABLED"));
        assert!(script.contains("GE-Proton9-1"));
        assert!(script.contains("waitforexitandrun"));
        assert!(script.contains("game.exe"));
        assert!(script.contains("GAME_EXIT_CODE=$?"));
        assert!(script.contains("exit $GAME_EXIT_CODE"));
    }

    #[test]
    fn build_script_rejects_missing_proton() {
        let options = LaunchOptions {
            game_path: "/path/to/game.exe".to_string(),
            env_vars: vec![],
            proton_path: None,
        };
        let result = build_wrapper_script(&options);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("No proton path"));
    }

    #[test]
    fn build_script_rejects_invalid_env_key() {
        let options = LaunchOptions {
            game_path: "/path/to/game.exe".to_string(),
            env_vars: vec![EnvVar {
                key: "BAD-KEY".to_string(),
                value: "val".to_string(),
                enabled: true,
            }],
            proton_path: Some("/proton".to_string()),
        };
        let result = build_wrapper_script(&options);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid environment variable key"));
    }
}
