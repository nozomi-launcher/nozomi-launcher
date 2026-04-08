use crate::models::profile::EnvVar;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchOptions {
    pub game_path: String,
    pub env_vars: Vec<EnvVar>,
    pub proton_path: Option<String>,
}

#[tauri::command]
pub async fn launch_game(options: LaunchOptions) -> Result<(), String> {
    let mut cmd = if let Some(proton_path) = &options.proton_path {
        let mut cmd = tokio::process::Command::new(format!("{proton_path}/proton"));
        cmd.arg("waitforexitandrun");
        cmd.arg(&options.game_path);
        cmd
    } else {
        tokio::process::Command::new(&options.game_path)
    };

    for env_var in &options.env_vars {
        if env_var.enabled {
            cmd.env(&env_var.key, &env_var.value);
        }
    }

    // Inherit Steam environment variables
    if let Ok(val) = std::env::var("STEAM_COMPAT_DATA_PATH") {
        cmd.env("STEAM_COMPAT_DATA_PATH", val);
    }
    if let Ok(val) = std::env::var("STEAM_COMPAT_CLIENT_INSTALL_PATH") {
        cmd.env("STEAM_COMPAT_CLIENT_INSTALL_PATH", val);
    }
    if let Ok(val) = std::env::var("SteamAppId") {
        cmd.env("SteamAppId", val);
    }

    let status = cmd.status().await.map_err(|e| e.to_string())?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Game exited with status: {}", status))
    }
}
