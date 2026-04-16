import { useFlowStore } from '../store/flowStore';

export function ChromeActions() {
  const saveNow = useFlowStore((s) => s.saveNow);
  const exportDraft = useFlowStore((s) => s.exportDraft);
  const setReleaseModalOpen = useFlowStore((s) => s.setReleaseModalOpen);

  return (
    <div className="fs-chrome">
      <button type="button" className="fs-chrome__btn" onClick={saveNow}>
        SAVE
      </button>
      <button type="button" className="fs-chrome__btn" onClick={() => setReleaseModalOpen(true)}>
        RELEASE
      </button>
      <button type="button" className="fs-chrome__btn" onClick={exportDraft}>
        Export
      </button>
    </div>
  );
}
