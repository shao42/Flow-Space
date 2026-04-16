import { useEffect, useRef } from 'react';
import { useFlowStore } from '../store/flowStore';

export function ConfirmReleaseModal() {
  const open = useFlowStore((s) => s.releaseModalOpen);
  const setOpen = useFlowStore((s) => s.setReleaseModalOpen);
  const confirmRelease = useFlowStore((s) => s.confirmRelease);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fs-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <div
        ref={panelRef}
        className="fs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fs-release-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="fs-release-title" className="fs-modal__title">
          Release 草稿？
        </h2>
        <p className="fs-modal__body">将清空编辑区并从本地存储移除草稿（不可撤销）。</p>
        <div className="fs-modal__actions">
          <button ref={cancelRef} type="button" className="fs-modal__btn" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button type="button" className="fs-modal__btn fs-modal__btn--danger" onClick={confirmRelease}>
            Release
          </button>
        </div>
      </div>
    </div>
  );
}
