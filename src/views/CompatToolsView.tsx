import { FocusContext, useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ButtonGlyph from "../components/ButtonGlyph";
import ButtonPrompt from "../components/ButtonPrompt";
import ErrorToast from "../components/ErrorToast";
import { FocusButton } from "../components/FocusElements";
import { useCompatStore } from "../stores/compatStore";
import { groupVersions, mergeVersions, useCompatToolsStore } from "../stores/compatToolsStore";
import { useSettingsStore } from "../stores/settingsStore";
import type { CompatToolStatus, InstallProgress } from "../types/compatTools";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatLastChecked(epochSecs: number | null): string {
  if (!epochSecs) return "Never";
  return new Date(epochSecs * 1000).toLocaleString();
}

function CategoryButton({
  group,
  isActive,
  hasSelected,
  onSelect,
}: {
  group: { category: string; versions: { status: CompatToolStatus }[] };
  isActive: boolean;
  hasSelected: boolean;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onSelect });
  const installed = group.versions.filter(
    (v) => v.status === "installed" || v.status === "selected",
  ).length;

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 text-sm transition-all
        focus:outline-none
        ${focused ? "ring-2 ring-steam-accent ring-inset" : ""}
        ${
          isActive
            ? "bg-steam-dark text-steam-accent border-l-2 border-steam-accent"
            : "text-steam-text-dim hover:text-steam-text hover:bg-steam-dark/50 border-l-2 border-transparent"
        }`}
    >
      <span className="font-medium flex items-center gap-1.5">
        {hasSelected && <span className="text-steam-green-bright">✓</span>}
        {group.category}
      </span>
      <span className="text-xs opacity-60">
        {installed > 0 ? `${installed} installed` : `${group.versions.length} versions`}
      </span>
    </div>
  );
}

function VersionRow({
  version,
  hasMultipleSources,
  onSelect,
  onInstall,
  onUninstall,
  installProgress,
}: {
  version: {
    tagName: string;
    status: CompatToolStatus;
    publishedAt: string | null;
    sourceName?: string | null;
  };
  hasMultipleSources: boolean;
  onSelect: (tagName: string) => void;
  onInstall: (tagName: string) => void;
  onUninstall: (tagName: string) => void;
  installProgress?: InstallProgress;
}) {
  const isInstalled = version.status === "installed" || version.status === "selected";
  const isInstalling = version.status === "installing" || !!installProgress;
  const { ref, focused } = useFocusable();

  return (
    <div
      ref={ref}
      tabIndex={0}
      className={`flex flex-col px-4 py-2.5
        border-b border-steam-border/20 last:border-b-0
        transition-colors focus:outline-none
        ${focused ? "ring-2 ring-inset ring-steam-accent bg-steam-mid/30" : "hover:bg-steam-mid/20"}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {version.status === "selected" && (
            <span className="text-steam-green-bright shrink-0" title="Active">
              ✓
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm text-steam-text">{version.tagName}</p>
              {hasMultipleSources && version.sourceName && (
                <span className="text-[10px] px-1.5 py-0.5 bg-steam-mid/30 border border-steam-border/50 rounded text-steam-text-dim uppercase tracking-wider">
                  {version.sourceName}
                </span>
              )}
            </div>
            {version.publishedAt && (
              <p className="text-xs text-steam-text-dim">{formatDate(version.publishedAt)}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Download button — only when not installed and not installing */}
          {!isInstalled && !isInstalling && (
            <FocusButton
              onClick={() => onInstall(version.tagName)}
              className="px-2.5 py-1 bg-steam-green/20 border border-steam-green/40 text-steam-green-bright rounded text-xs font-medium uppercase tracking-wider
                hover:bg-steam-green/30 hover:border-steam-green-bright transition-all
                focus:outline-none focus:ring-2 focus:ring-steam-green-bright"
            >
              Download
            </FocusButton>
          )}
          {/* Select button — only when installed */}
          {isInstalled && (
            <FocusButton
              onClick={() => onSelect(version.tagName)}
              className="px-2.5 py-1 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-xs font-medium uppercase tracking-wider
                hover:bg-steam-accent/30 hover:border-steam-accent transition-all
                focus:outline-none focus:ring-2 focus:ring-steam-accent"
            >
              Select
            </FocusButton>
          )}
          {/* Delete button — only when installed */}
          {isInstalled && (
            <FocusButton
              onClick={() => onUninstall(version.tagName)}
              className="px-2.5 py-1 bg-steam-red/20 border border-steam-red/40 text-steam-red-bright rounded text-xs font-medium uppercase tracking-wider
                hover:bg-steam-red/30 hover:border-steam-red-bright transition-all
                focus:outline-none focus:ring-2 focus:ring-steam-red"
            >
              Delete
            </FocusButton>
          )}
        </div>
      </div>
      {/* Progress bar */}
      {installProgress && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-steam-text-dim mb-1">
            <span className="font-medium">
              {installProgress.stage === "downloading"
                ? "Downloading..."
                : installProgress.stage === "extracting"
                  ? "Extracting..."
                  : installProgress.stage}
            </span>
            <span>{Math.round(installProgress.progressPct)}%</span>
          </div>
          <div className="w-full bg-steam-mid/40 rounded-full h-2 border border-steam-border/30">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                installProgress.stage === "extracting"
                  ? "bg-steam-accent animate-pulse"
                  : "bg-steam-green-bright"
              }`}
              style={{
                width: `${installProgress.stage === "extracting" ? 100 : Math.max(installProgress.progressPct, 1)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompatToolsView() {
  const releases = useCompatToolsStore((s) => s.releases);
  const installedVersions = useCompatToolsStore((s) => s.installedVersions);
  const isLoading = useCompatToolsStore((s) => s.isLoading);
  const error = useCompatToolsStore((s) => s.error);
  const fetchReleases = useCompatToolsStore((s) => s.fetchReleases);
  const fetchInstalled = useCompatToolsStore((s) => s.fetchInstalled);
  const lastCheckedEpochSecs = useCompatToolsStore((s) => s.lastCheckedEpochSecs);
  const installing = useCompatToolsStore((s) => s.installing);
  const installTool = useCompatToolsStore((s) => s.installTool);
  const uninstallTool = useCompatToolsStore((s) => s.uninstallTool);
  const globalCompatTool = useCompatStore((s) => s.globalCompatTool);
  const setGlobalCompatTool = useCompatStore((s) => s.setGlobalCompatTool);
  const extraSources = useSettingsStore((s) => s.sources);
  const settingsInitialized = useSettingsStore((s) => s.initialized);
  const loadSources = useSettingsStore((s) => s.loadSources);
  const hasMultipleSources = extraSources.some((s) => s.enabled);

  const installingSet = useMemo(() => new Set(installing.keys()), [installing]);

  const versions = useMemo(
    () => mergeVersions(releases, installedVersions, globalCompatTool, installingSet),
    [releases, installedVersions, globalCompatTool, installingSet],
  );
  const groups = useMemo(() => groupVersions(versions), [versions]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const versionPanelRef = useRef<HTMLDivElement>(null);

  const handleDismissError = useCallback(() => {
    useCompatToolsStore.setState({ error: null });
  }, []);

  useEffect(() => {
    if (groups.length === 0) return;
    if (!activeCategory || !groups.some((g) => g.category === activeCategory)) {
      setActiveCategory(groups[0].category);
    }
  }, [groups, activeCategory]);

  useEffect(() => {
    if (versionPanelRef.current) {
      versionPanelRef.current.scrollTop = 0;
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchReleases();
    fetchInstalled();
  }, [fetchReleases, fetchInstalled]);

  useEffect(() => {
    if (!settingsInitialized) {
      loadSources();
    }
  }, [settingsInitialized, loadSources]);

  const handleRefresh = () => {
    fetchReleases(true);
    fetchInstalled();
  };

  const handleSelect = async (tagName: string) => {
    await setGlobalCompatTool(tagName);
  };

  const handleInstall = (tagName: string) => {
    const release = releases.find((r) => r.tagName === tagName);
    if (release) {
      installTool(release);
    }
  };

  const handleUninstall = (tagName: string) => {
    uninstallTool(tagName);
  };

  const { ref: viewRef, focusKey } = useFocusable({ focusKey: "view-compat" });

  const activeGroup = groups.find((g) => g.category === activeCategory);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={viewRef} className="flex flex-col h-full overflow-hidden">
        {/* Error toast popup */}
        {error && <ErrorToast message={error} onDismiss={handleDismissError} />}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-steam-accent">
              Compatibility Tools
            </h2>
            {globalCompatTool && (
              <p className="text-xs text-steam-text-dim mt-0.5">
                Active:{" "}
                <span className="text-steam-green-bright font-medium">{globalCompatTool}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-steam-text-dim">
              Last checked: {formatLastChecked(lastCheckedEpochSecs)}
            </span>
            <div className="flex items-center gap-1.5">
              <ButtonGlyph action="REFRESH" />
              <FocusButton
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-3 py-1 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-sm font-medium uppercase tracking-wider
                hover:bg-steam-accent/30 hover:border-steam-accent transition-all
                focus:outline-none focus:ring-2 focus:ring-steam-accent
                disabled:bg-steam-mid/20 disabled:border-steam-border disabled:text-steam-text-dim"
              >
                {isLoading ? "Loading..." : "Refresh"}
              </FocusButton>
            </div>
          </div>
        </div>

        {/* Main content: sidebar + panel */}
        {isLoading && groups.length === 0 ? (
          <div className="px-4 flex-1 min-h-0">
            <p className="text-steam-text-dim text-sm">Loading releases...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="px-4 flex-1 min-h-0">
            <p className="text-steam-text-dim text-sm">No versions found.</p>
          </div>
        ) : (
          <div className="flex mx-4 border border-steam-border rounded overflow-hidden flex-1 min-h-0">
            {/* Sidebar: categories */}
            <SidebarNav
              groups={groups}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
            />

            {/* Right panel: versions */}
            <VersionPanel
              versionPanelRef={versionPanelRef}
              activeGroup={activeGroup}
              hasMultipleSources={hasMultipleSources}
              onSelect={handleSelect}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
              installing={installing}
            />
          </div>
        )}

        {/* Footer: button prompts */}
        <div className="flex items-center justify-end gap-6 px-4 py-2 border-t border-steam-border/50 bg-steam-darkest/80 shrink-0">
          <ButtonPrompt action="CONFIRM" label="Select" />
          <ButtonPrompt action="CANCEL" label="Cancel" />
          <ButtonPrompt action="REFRESH" label="Refresh" />
        </div>
      </div>
    </FocusContext.Provider>
  );
}

function SidebarNav({
  groups,
  activeCategory,
  onSelect,
}: {
  groups: { category: string; versions: { status: CompatToolStatus }[] }[];
  activeCategory: string | null;
  onSelect: (category: string) => void;
}) {
  const { ref, focusKey } = useFocusable({
    focusKey: "compat-sidebar",
    saveLastFocusedChild: true,
    trackChildren: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <nav
        ref={ref}
        className="w-48 flex-shrink-0 bg-steam-darkest border-r border-steam-border overflow-y-auto"
      >
        {groups.map((group) => (
          <CategoryButton
            key={group.category}
            group={group}
            isActive={activeCategory === group.category}
            hasSelected={group.versions.some((v) => v.status === "selected")}
            onSelect={() => onSelect(group.category)}
          />
        ))}
      </nav>
    </FocusContext.Provider>
  );
}

function VersionPanel({
  versionPanelRef,
  activeGroup,
  hasMultipleSources,
  onSelect,
  onInstall,
  onUninstall,
  installing,
}: {
  versionPanelRef: React.RefObject<HTMLDivElement | null>;
  activeGroup:
    | {
        versions: {
          tagName: string;
          status: CompatToolStatus;
          publishedAt: string | null;
          sourceName?: string | null;
        }[];
      }
    | undefined;
  hasMultipleSources: boolean;
  onSelect: (tagName: string) => void;
  onInstall: (tagName: string) => void;
  onUninstall: (tagName: string) => void;
  installing: Map<string, InstallProgress>;
}) {
  const { ref, focusKey } = useFocusable({
    focusKey: "compat-versions",
    saveLastFocusedChild: true,
    trackChildren: true,
  });

  const setRefs = (el: HTMLDivElement | null) => {
    (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    (versionPanelRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={setRefs} className="flex-1 overflow-y-auto bg-steam-dark/50">
        {activeGroup ? (
          <div>
            {activeGroup.versions.map((version) => (
              <VersionRow
                key={version.tagName}
                version={version}
                hasMultipleSources={hasMultipleSources}
                onSelect={onSelect}
                onInstall={onInstall}
                onUninstall={onUninstall}
                installProgress={installing.get(version.tagName)}
              />
            ))}
          </div>
        ) : (
          <p className="p-4 text-steam-text-dim text-sm">Select a version group.</p>
        )}
      </div>
    </FocusContext.Provider>
  );
}
