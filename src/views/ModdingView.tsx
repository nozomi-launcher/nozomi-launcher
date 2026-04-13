import { FocusContext, useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import ButtonPrompt from "../components/ButtonPrompt";

export default function ModdingView() {
  const { ref, focusKey } = useFocusable({ focusKey: "view-modding" });

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center text-steam-text-dim">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-steam-accent">Modding</h2>
            <p>Modding support coming soon.</p>
          </div>
        </div>

        {/* Footer: button prompts */}
        <div className="flex items-center justify-end gap-6 px-4 py-2 border-t border-steam-border/50 bg-steam-darkest/80 shrink-0">
          <ButtonPrompt action="CANCEL" label="Cancel" />
        </div>
      </div>
    </FocusContext.Provider>
  );
}
