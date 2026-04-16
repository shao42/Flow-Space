import { useCallback, useEffect, useRef, useState } from 'react';
import { useFlowStore } from '../store/flowStore';

function previewLine(text: string): string {
  const lines = text.split(/\r?\n/);
  const first = lines.find((l) => l.trim().length > 0) ?? '';
  const useLine = first || text;
  if (useLine.length <= 56) return useLine || '(empty)';
  return `${useLine.slice(0, 56)}…`;
}

export function DraftHistoryMenu() {
  const draftHistory = useFlowStore((s) => s.draftHistory);
  const restoreDraftFromHistory = useFlowStore((s) => s.restoreDraftFromHistory);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const root = wrapRef.current;
      if (!root) return;
      const t = e.target as Node | null;
      if (t && root.contains(t)) return;
      if (typeof e.composedPath === 'function' && e.composedPath().includes(root)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  const onRestore = useCallback(
    (id: string) => {
      restoreDraftFromHistory(id);
      setOpen(false);
    },
    [restoreDraftFromHistory]
  );

  return (
    <div className="fs-draft-history" ref={wrapRef}>
      <button
        type="button"
        className="fs-chrome__btn"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="fs-draft-history-list"
        onClick={() => setOpen((v) => !v)}
      >
        History
      </button>
      {open && (
        <div
          id="fs-draft-history-list"
          className="fs-draft-history__panel"
          role="menu"
          aria-label="Recent saved drafts"
        >
          {draftHistory.length === 0 ? (
            <p className="fs-draft-history__empty">No saved snapshots yet — press SAVE to add one.</p>
          ) : (
            <ul className="fs-draft-history__list">
              {draftHistory.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className="fs-draft-history__item"
                    onClick={() => onRestore(e.id)}
                  >
                    <span className="fs-draft-history__time">
                      {new Date(e.savedAt).toLocaleString()}
                    </span>
                    <span className="fs-draft-history__preview">{previewLine(e.text)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
