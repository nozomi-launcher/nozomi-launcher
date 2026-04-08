# GitHub Actions

## Workflows

### Build and Release (`release.yml`)

Triggered when a `v*` tag is pushed. Runs tests, builds the Tauri app, creates a GitHub release with bundled artifacts (.deb, .rpm, .AppImage), and uploads a Steam compatibility tool tarball.

### Dispatch Release (`dispatch-release.yml`)

Triggered manually via the GitHub Actions UI. Reads the version from `src-tauri/Cargo.toml`, checks if a `v*` tag already exists for that version, and creates one if not. Then directly calls the Build and Release workflow via `workflow_call` (tags created by `GITHUB_TOKEN` don't trigger other workflows, so the dispatch workflow invokes the release workflow explicitly).

## Release process

1. Bump the `version` field in `src-tauri/Cargo.toml`
2. Open a PR and merge to `main`
3. Go to **Actions > Dispatch Release > Run workflow**
4. The dispatch workflow creates the tag, which triggers the build and release

## Release artifacts

Each release includes:

- `nozomi-launcher_<version>_amd64.deb` - Debian package
- `nozomi-launcher-<version>-1.x86_64.rpm` - RPM package
- `nozomi-launcher_<version>_amd64.AppImage` - AppImage
- `nozomi-launcher-v<version>.tar.gz` - Steam compatibility tool tarball (binary + VDF manifests + launcher script), extract to `~/.steam/root/compatibilitytools.d/`
