import { useProfileStore } from "../stores/profileStore";

export default function EnvVarEditor() {
  const envVars = useProfileStore((s) => s.envVars);
  const addEnvVar = useProfileStore((s) => s.addEnvVar);
  const updateEnvVar = useProfileStore((s) => s.updateEnvVar);
  const removeEnvVar = useProfileStore((s) => s.removeEnvVar);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wider text-steam-accent">
          Environment Variables
        </h3>
        <button
          data-focusable
          onClick={addEnvVar}
          className="px-3 py-1 bg-steam-accent/20 border border-steam-accent/40 text-steam-accent rounded text-sm
            hover:bg-steam-accent/30 hover:border-steam-accent transition-all
            focus:outline-none focus:ring-2 focus:ring-steam-accent"
        >
          + Add
        </button>
      </div>

      {envVars.length === 0 && (
        <p className="text-steam-text-dim text-sm">No environment variables configured.</p>
      )}

      {envVars.map((envVar, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={envVar.enabled}
            onChange={(e) => updateEnvVar(index, "enabled", e.target.checked)}
            data-focusable
            className="w-4 h-4 accent-steam-accent focus:ring-2 focus:ring-steam-accent"
          />
          <input
            type="text"
            placeholder="KEY"
            value={envVar.key}
            onChange={(e) => updateEnvVar(index, "key", e.target.value)}
            data-focusable
            className="flex-1 bg-steam-mid/50 border border-steam-border rounded px-3 py-1.5 text-sm text-steam-text
              placeholder:text-steam-text-dim/50
              focus:outline-none focus:ring-2 focus:ring-steam-accent focus:border-steam-accent
              hover:border-steam-accent/50 transition-colors"
          />
          <span className="text-steam-text-dim">=</span>
          <input
            type="text"
            placeholder="value"
            value={envVar.value}
            onChange={(e) => updateEnvVar(index, "value", e.target.value)}
            data-focusable
            className="flex-1 bg-steam-mid/50 border border-steam-border rounded px-3 py-1.5 text-sm text-steam-text
              placeholder:text-steam-text-dim/50
              focus:outline-none focus:ring-2 focus:ring-steam-accent focus:border-steam-accent
              hover:border-steam-accent/50 transition-colors"
          />
          <button
            data-focusable
            onClick={() => removeEnvVar(index)}
            className="px-2 py-1 bg-steam-red/20 border border-steam-red/40 text-steam-red-bright rounded text-sm
              hover:bg-steam-red/30 hover:border-steam-red-bright transition-all
              focus:outline-none focus:ring-2 focus:ring-steam-red"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
