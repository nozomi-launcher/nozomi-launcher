use std::sync::Mutex;
use tauri::State;

use crate::models::launch_context::LaunchContext;
use crate::state::AppState;

#[tauri::command]
pub fn get_launch_context(state: State<'_, Mutex<AppState>>) -> Option<LaunchContext> {
    let state = state.lock().unwrap();
    state.launch_context.clone()
}
