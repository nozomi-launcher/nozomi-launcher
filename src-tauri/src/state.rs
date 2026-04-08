use crate::models::launch_context::LaunchContext;

pub struct AppState {
    pub launch_context: Option<LaunchContext>,
}

impl AppState {
    pub fn new(launch_context: Option<LaunchContext>) -> Self {
        Self { launch_context }
    }
}
