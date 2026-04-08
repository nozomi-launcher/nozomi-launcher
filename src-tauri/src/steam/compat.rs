use crate::models::launch_context::LaunchContext;

/// Parse launch context from raw arguments and environment variables.
///
/// When Steam invokes nozomi-launcher as a compatibility tool, it calls:
///   nozomi-launcher waitforexitandrun /path/to/game.exe
///
/// Along with environment variables:
///   STEAM_COMPAT_DATA_PATH, SteamAppId, STEAM_COMPAT_CLIENT_INSTALL_PATH
///
/// Returns None when launched standalone (no verb/game path arguments).
pub fn parse_launch_context() -> Option<LaunchContext> {
    let args: Vec<String> = std::env::args().collect();
    parse_launch_context_from_args(&args)
}

pub fn parse_launch_context_from_args(args: &[String]) -> Option<LaunchContext> {
    let verb = args.get(1)?.to_string();
    let game_path = args.get(2)?.to_string();

    let steam_app_id = std::env::var("SteamAppId").ok();
    let steam_compat_data_path = std::env::var("STEAM_COMPAT_DATA_PATH").ok();
    let steam_client_install_path = std::env::var("STEAM_COMPAT_CLIENT_INSTALL_PATH").ok();

    Some(LaunchContext {
        verb,
        game_path,
        steam_app_id,
        steam_compat_data_path,
        steam_client_install_path,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_with_verb_and_game_path() {
        let args = vec![
            "nozomi-launcher".to_string(),
            "waitforexitandrun".to_string(),
            "/home/user/.steam/steamapps/common/Game/game.exe".to_string(),
        ];
        let ctx = parse_launch_context_from_args(&args).unwrap();
        assert_eq!(ctx.verb, "waitforexitandrun");
        assert_eq!(ctx.game_path, "/home/user/.steam/steamapps/common/Game/game.exe");
    }

    #[test]
    fn parse_standalone_returns_none() {
        let args = vec!["nozomi-launcher".to_string()];
        assert!(parse_launch_context_from_args(&args).is_none());
    }

    #[test]
    fn parse_missing_game_path_returns_none() {
        let args = vec![
            "nozomi-launcher".to_string(),
            "waitforexitandrun".to_string(),
        ];
        assert!(parse_launch_context_from_args(&args).is_none());
    }

    #[test]
    fn parse_empty_args_returns_none() {
        let args: Vec<String> = vec![];
        assert!(parse_launch_context_from_args(&args).is_none());
    }
}
