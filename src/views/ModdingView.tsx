import { FocusContext, useFocusable } from "@noriginmedia/norigin-spatial-navigation";

export default function ModdingView() {
  const { ref, focusKey } = useFocusable({ focusKey: "view-modding" });

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="flex flex-col items-center justify-center h-full text-steam-text-dim">
        <h2 className="text-2xl font-bold mb-4 text-steam-accent">Modding</h2>
        <p>Modding support coming soon.</p>
      </div>
    </FocusContext.Provider>
  );
}
