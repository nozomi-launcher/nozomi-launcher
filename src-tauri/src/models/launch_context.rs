use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchContext {
    pub verb: String,
    pub game_path: String,
    pub steam_app_id: Option<String>,
    pub steam_compat_data_path: Option<String>,
    pub steam_client_install_path: Option<String>,
}
