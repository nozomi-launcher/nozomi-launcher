import { FocusContext, setFocus, useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ButtonGlyph from "../components/ButtonGlyph";
import ButtonPrompt from "../components/ButtonPrompt";
import { FocusButton } from "../components/FocusElements";
import { useAppStore } from "../stores/appStore";
import { useCompatStore } from "../stores/compatStore";
import { groupVersions, mergeVersions, useCompatToolsStore } from "../stores/compatToolsStore";
import { useSettingsStore } from "../stores/settingsStore";
import type { CompatToolStatus, InstallProgress } from "../types/compatTools";

function StatusBadge({ status }: { status: CompatToolStatus }) {
  const styles = {
    available: "bg-steam-mid/30 text-steam-text-dim border border-steam-border/50",
    installed: "bg-steam-green/20 text-steam-green-bright border border-steam-green/40",
    selected: "bg-steam-accent/20 text-steam-accent border border-steam-accent/40",
    installing: "bg-steam-accent/20 text-steam-accent border border-steam-accent/40 animate-pulse",
  };

  const labels = {
    available: "Available",
    installed: "Installed",
    selected: "Active",
    installing: "Installing",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

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
  onSelect,
}: {
  group: { category: string; versions: { status: CompatToolStatus }[] };
  isActive: boolean;
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
      <span className="font-medium block">{group.category}</span>
      <span className="text-xs opacity-60">
        {installed > 0 ? `${installed} installed` : `${group.versions.length} versions`}
      </span>
    </div>
  );
}

function VersionRow({
  version,
  hasMultipleSources,
  onActivate,
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
  onActivate: (tagName: string) => void;
  onInstall: (tagName: string) => void;
  onUninstall: (tagName: string) => void;
  installProgress?: InstallProgress;
}) {
  const isActionable = version.status === "installed" || version.status === "available";
  const { ref, focused } = useFocusable({
    onEnterPress: version.status === "installed"
      ? () => onActivate(version.tagName)
      : version.status === "available"
        ? () => onInstall(version.tagName)
        : undefined,
  });

  return (
    <div
      ref={ref}
      tabIndex={0}
      onClick={
        version.status === "installed"
          ? () => onActivate(version.tagName)
          : version.status === "available"
            ? () => onInstall(version.tagName)
            : undefined
      }
      className={`flex flex-col px-4 py-2.5
        border-b border-steam-border/20 last:border-b-0
        hover:bg-steam-mid/20 transition-colors
        focus:outline-none
        ${focused ? "ring-2 ring-inset ring-steam-accent bg-steam-mid/30" : ""}
        ${isActionable ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div>
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
        <div className="flex items-center gap-2">
          <StatusBadge status={version.status} />
          {version.status === "available" && (
            <span
              className="px-2.5 py-1 bg-steam-green/20 border border-steam-green/40 text-steam-green-bright rounded text-xs font-medium uppercase tracking-wider
                hover:bg-steam-green/30 hover:border-steam-green-bright transition-all"
            >
              Install
            </span>
          )}
          {version.status === "installed" && (
            <span
              className="px-2.5 py-1 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-xs font-medium uppercase tracking-wider
                hover:bg-steam-accent/30 hover:border-steam-accent transition-all"
            >
              Activate
            </span>
          )}
          {(version.status === "installed" || version.status === "selected") && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUninstall(version.tagName);
              }}
              className="px-2.5 py-1 bg-steam-red/20 border border-steam-red/40 text-steam-red-bright rounded text-xs font-medium uppercase tracking-wider
                hover:bg-steam-red/30 hover:border-steam-red-bright transition-all"
            >
              Uninstall
            </button>
          )}
        </div>
      </div>
      {installProgress && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-steam-text-dim mb-1">
            <span>
              {installProgress.stage === "downloading" ? "Downloading..." : "Extracting..."}
            </span>
            <span>{Math.round(installProgress.progressPct)}%</span>
          </div>
          <div className="w-full bg-steam-darkest rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                installProgress.stage === "extracting"
                  ? "bg-steam-accent animate-pulse"
                  : "bg-steam-green"
              }`}
              style={{
                width: `${installProgress.stage === "extracting" ? 100 : installProgress.progressPct}%`,
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
  const setActiveTab = useAppStore((s) => s.setActiveTab);
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
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const visibleError = error && error !== dismissedError ? error : null;

  const handleDismissError = useCallback(() => {
    if (error) setDismissedError(error);
  }, [error]);

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

  const handleActivate = async (tagName: string) => {
    await setGlobalCompatTool(tagName);
    setActiveTab("launch");
    requestAnimationFrame(() => {
      setFocus("view-launch");
    });
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
        {visibleError && (
          <div className="fixed top-20 right-6 z-50 max-w-sm animate-slide-in">
            <div className="bg-steam-darkest border border-steam-red/40 rounded-lg shadow-lg shadow-black/40 p-4">
              <div className="flex items-start gap-3">
                <span className="text-steam-red-bright text-lg leading-none shrink-0">⚠</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-steam-red-bright mb-0.5">Error</p>
                  <p className="text-xs text-steam-text-dim break-words">{visibleError}</p>
                </div>
                <button
                  type="button"
                  onClick={handleDismissError}
                  className="text-steam-text-dim hover:text-steam-text transition-colors text-lg leading-none shrink-0"
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <h2 className="text-sm font-medium uppercase tracking-wider text-steam-accent">
            Compatibility Tools
          </h2>
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
              onActivate={handleActivate}
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
  onActivate,
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
  onActivate: (tagName: string) => void;
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
                onActivate={onActivate}
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
