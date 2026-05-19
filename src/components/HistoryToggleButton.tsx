import { useFlowStore } from '../store/flowStore';

/** History control in the editor chrome; sidebar renders via portal in App. */
export function HistoryToggleButton() {
  const historyPanelOpen = useFlowStore((s) => s.historyPanelOpen);
  const toggleHistoryPanel = useFlowStore((s) => s.toggleHistoryPanel);

  return (
    <button
      id="fs-history-trigger"
      type="button"
      className={`fs-chrome__btn${historyPanelOpen ? ' fs-chrome__btn--active' : ''}`}
      aria-expanded={historyPanelOpen}
      aria-controls="fs-history-sidebar"
      onClick={() => toggleHistoryPanel()}
    >
      History
    </button>
  );
}
