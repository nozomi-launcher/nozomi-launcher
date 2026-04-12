import { FocusContext, useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { useEffect, useState } from "react";
import { FocusButton, FocusInput } from "../components/FocusElements";
import { useCompatToolsStore } from "../stores/compatToolsStore";
import { useSettingsStore } from "../stores/settingsStore";
import type { SourceStatus } from "../types/compatTools";

const DEFAULT_MANIFEST_NAME = "Proton-GE Official";
const DEFAULT_MANIFEST_URL =
  "https://raw.githubusercontent.com/nozomi-launcher/nozomi-launcher/main/manifests/proton-ge.json";

function StatusLine({ status }: { status: SourceStatus | undefined }) {
  if (!status) {
    return <p className="text-xs text-steam-text-dim/60">Status unknown</p>;
  }
  if (status.success) {
    return (
      <p className="text-xs text-steam-green-bright">
        ✓ {status.releaseCount} release{status.releaseCount !== 1 && "s"}
      </p>
    );
  }
  return <p className="text-xs text-steam-red-bright">✗ {status.error ?? "Failed to load"}</p>;
}

function SourceRow({
  source,
  status,
  onToggle,
  onRemove,
}: {
  source: { id: string; name: string; url: string; enabled: boolean };
  status: SourceStatus | undefined;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { ref, focusKey } = useFocusable();

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="bg-steam-mid/30 border border-steam-border/50 rounded p-3 mb-2"
        data-testid={`source-${source.id}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-steam-text">{source.name}</p>
              {!source.enabled && (
                <span className="text-[10px] px-1.5 py-0.5 bg-steam-mid/60 border border-steam-border text-steam-text-dim rounded uppercase tracking-wider">
                  Disabled
                </span>
              )}
            </div>
            <p className="text-xs text-steam-text-dim/70 break-all" title={source.url}>
              {source.url}
            </p>
            <div className="mt-1">
              {source.enabled ? (
                <StatusLine status={status} />
              ) : (
                <p className="text-xs text-steam-text-dim/60">Not fetched</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <FocusButton
              onClick={() => onToggle(source.id)}
              className="px-2.5 py-1 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-xs font-medium uppercase tracking-wider
                hover:bg-steam-accent/30 hover:border-steam-accent transition-all
                focus:outline-none focus:ring-2 focus:ring-steam-accent"
            >
              {source.enabled ? "Disable" : "Enable"}
            </FocusButton>
            <FocusButton
              onClick={() => onRemove(source.id)}
              className="px-2.5 py-1 bg-steam-red/20 border border-steam-red/40 text-steam-red-bright rounded text-xs font-medium uppercase tracking-wider
                hover:bg-steam-red/30 hover:border-steam-red-bright transition-all
                focus:outline-none focus:ring-2 focus:ring-steam-red"
            >
              Remove
            </FocusButton>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}

export default function SettingsView() {
  const sources = useSettingsStore((s) => s.sources);
  const initialized = useSettingsStore((s) => s.initialized);
  const loadSources = useSettingsStore((s) => s.loadSources);
  const addSource = useSettingsStore((s) => s.addSource);
  const removeSource = useSettingsStore((s) => s.removeSource);
  const toggleSource = useSettingsStore((s) => s.toggleSource);
  const sourceStatus = useCompatToolsStore((s) => s.sourceStatus);
  const fetchReleases = useCompatToolsStore((s) => s.fetchReleases);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    if (!initialized) {
      loadSources();
    }
  }, [initialized, loadSources]);

  const defaultStatus = sourceStatus.find((s) => s.sourceName === DEFAULT_MANIFEST_NAME);

  const handleAdd = async () => {
    const name = newName.trim();
    const url = newUrl.trim();
    if (!name || !url) return;
    await addSource(name, url);
    setNewName("");
    setNewUrl("");
    setIsAdding(false);
    await fetchReleases();
  };

  const handleCancelAdd = () => {
    setNewName("");
    setNewUrl("");
    setIsAdding(false);
  };

  const handleRemove = async (id: string) => {
    await removeSource(id);
    await fetchReleases();
  };

  const handleToggle = async (id: string) => {
    await toggleSource(id);
    await fetchReleases();
  };

  const { ref: viewRef, focusKey } = useFocusable({ focusKey: "tab-settings" });

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={viewRef} className="max-w-3xl mx-auto space-y-4">
      <section className="bg-steam-dark/80 border border-steam-border rounded p-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-steam-accent mb-3">
          Compatibility Tool Sources
        </h2>
        <p className="text-xs text-steam-text-dim/60 mb-4">
          The launcher fetches compatibility tool releases from pre-processed manifests. You can add
          additional sources to support custom builds.
        </p>

        {/* Default source — locked */}
        <div
          className="bg-steam-mid/30 border border-steam-border/50 rounded p-3 mb-2"
          data-testid="default-source"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-steam-text">{DEFAULT_MANIFEST_NAME}</p>
                <span className="text-[10px] px-1.5 py-0.5 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded uppercase tracking-wider">
                  Default
                </span>
              </div>
              <p className="text-xs text-steam-text-dim/70 break-all" title={DEFAULT_MANIFEST_URL}>
                {DEFAULT_MANIFEST_URL}
              </p>
              <div className="mt-1">
                <StatusLine status={defaultStatus} />
              </div>
            </div>
          </div>
        </div>

        {/* Extra sources */}
        {sources.map((source) => (
          <SourceRow
            key={source.id}
            source={source}
            status={sourceStatus.find((s) => s.sourceName === source.name)}
            onToggle={handleToggle}
            onRemove={handleRemove}
          />
        ))}

        {/* Add source */}
        <div className="mt-3">
          {isAdding ? (
            <div className="bg-steam-mid/30 border border-steam-border/50 rounded p-3 space-y-2">
              <FocusInput
                type="text"
                autoFocus
                placeholder="Source name (e.g. CachyOS Proton)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-steam-mid/50 border border-steam-border rounded px-3 py-2 text-sm text-steam-text
                  placeholder:text-steam-text-dim/50
                  focus:outline-none focus:ring-2 focus:ring-steam-accent focus:border-steam-accent
                  hover:border-steam-accent/50 transition-colors"
              />
              <FocusInput
                type="text"
                placeholder="Manifest URL (https://...)"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") handleCancelAdd();
                }}
                className="w-full bg-steam-mid/50 border border-steam-border rounded px-3 py-2 text-sm text-steam-text
                  placeholder:text-steam-text-dim/50
                  focus:outline-none focus:ring-2 focus:ring-steam-accent focus:border-steam-accent
                  hover:border-steam-accent/50 transition-colors"
              />
              <div className="flex gap-2">
                <FocusButton
                  onClick={handleAdd}
                  disabled={!newName.trim() || !newUrl.trim()}
                  className="px-4 py-1.5 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-sm font-medium uppercase tracking-wider
                    hover:bg-steam-accent/30 hover:border-steam-accent transition-all
                    focus:outline-none focus:ring-2 focus:ring-steam-accent
                    disabled:bg-steam-mid/20 disabled:border-steam-border disabled:text-steam-text-dim"
                >
                  Save
                </FocusButton>
                <FocusButton
                  onClick={handleCancelAdd}
                  className="px-4 py-1.5 bg-steam-mid/30 border border-steam-border text-steam-text-dim rounded text-sm font-medium uppercase tracking-wider
                    hover:bg-steam-mid/50 hover:border-steam-accent/50 transition-all
                    focus:outline-none focus:ring-2 focus:ring-steam-accent"
                >
                  Cancel
                </FocusButton>
              </div>
            </div>
          ) : (
            <FocusButton
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-sm font-medium uppercase tracking-wider
                hover:bg-steam-accent/30 hover:border-steam-accent transition-all
                focus:outline-none focus:ring-2 focus:ring-steam-accent"
            >
              + Add Manifest Source
            </FocusButton>
          )}
        </div>
      </section>
    </div>
    </FocusContext.Provider>
  );
}
