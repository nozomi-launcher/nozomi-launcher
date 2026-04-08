import { useProfileStore } from "../stores/profileStore";

export default function EnvVarEditor() {
  const envVars = useProfileStore((s) => s.envVars);
  const addEnvVar = useProfileStore((s) => s.addEnvVar);
  const updateEnvVar = useProfileStore((s) => s.updateEnvVar);
  const removeEnvVar = useProfileStore((s) => s.removeEnvVar);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Environment Variables</h3>
        <button
          data-focusable
          onClick={addEnvVar}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm
            focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          + Add
        </button>
      </div>

      {envVars.length === 0 && (
        <p className="text-gray-500 text-sm">No environment variables configured.</p>
      )}

      {envVars.map((envVar, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={envVar.enabled}
            onChange={(e) => updateEnvVar(index, "enabled", e.target.checked)}
            data-focusable
            className="w-4 h-4 accent-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="KEY"
            value={envVar.key}
            onChange={(e) => updateEnvVar(index, "key", e.target.value)}
            data-focusable
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-gray-500">=</span>
          <input
            type="text"
            placeholder="value"
            value={envVar.value}
            onChange={(e) => updateEnvVar(index, "value", e.target.value)}
            data-focusable
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            data-focusable
            onClick={() => removeEnvVar(index)}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm
              focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
