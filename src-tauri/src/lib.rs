mod commands;
mod models;
mod state;
mod steam;

use state::AppState;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let launch_context = steam::compat::parse_launch_context();

    tauri::Builder::default()
        .manage(Mutex::new(AppState::new(launch_context)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::steam::get_launch_context,
            commands::launch::launch_game,
            commands::profiles::list_profiles,
            commands::profiles::save_profile,
            commands::profiles::delete_profile,
            commands::profiles::load_profile,
            commands::proton::list_proton_versions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
