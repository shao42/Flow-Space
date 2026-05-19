import { useCallback, useEffect, useRef } from 'react';
import { useFlowStore } from '../store/flowStore';
import { useMailboxStore } from '../store/mailboxStore';

function previewLine(text: string): string {
  const lines = text.split(/\r?\n/);
  const first = lines.find((l) => l.trim().length > 0) ?? '';
  const useLine = first || text;
  if (useLine.length <= 56) return useLine || '(空)';
  return `${useLine.slice(0, 56)}…`;
}

function formatSavedAt(isoOrMs: string | number): string {
  const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

function HistoryListItem({
  savedAt,
  preview,
  onSelect,
}: {
  savedAt: string | number;
  preview: string;
  onSelect: () => void;
}) {
  return (
    <li>
      <button type="button" className="fs-history-sidebar__item" onClick={onSelect}>
        <span className="fs-history-sidebar__time">{formatSavedAt(savedAt)}</span>
        <span className="fs-history-sidebar__preview">{preview}</span>
      </button>
    </li>
  );
}

export function DraftHistorySidebar() {
  const draftHistory = useFlowStore((s) => s.draftHistory);
  const historyPanelOpen = useFlowStore((s) => s.historyPanelOpen);
  const cloudHistory = useFlowStore((s) => s.cloudHistory);
  const cloudHistoryLoading = useFlowStore((s) => s.cloudHistoryLoading);
  const cloudHistoryError = useFlowStore((s) => s.cloudHistoryError);
  const historySyncing = useFlowStore((s) => s.historySyncing);
  const toggleHistoryPanel = useFlowStore((s) => s.toggleHistoryPanel);
  const setHistoryPanelOpen = useFlowStore((s) => s.setHistoryPanelOpen);
  const restoreDraftFromHistory = useFlowStore((s) => s.restoreDraftFromHistory);
  const restoreFromCloud = useFlowStore((s) => s.restoreFromCloud);
  const syncLocalToCloud = useFlowStore((s) => s.syncLocalToCloud);

  const session = useMailboxStore((s) => s.session);
  const setPanelOpen = useMailboxStore((s) => s.setPanelOpen);
  const setView = useMailboxStore((s) => s.setView);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!historyPanelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHistoryPanelOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [historyPanelOpen, setHistoryPanelOpen]);

  useEffect(() => {
    if (!historyPanelOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (sidebarRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setHistoryPanelOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [historyPanelOpen, setHistoryPanelOpen]);

  const openMailboxAuth = useCallback(() => {
    setPanelOpen(true);
    setView('auth');
  }, [setPanelOpen, setView]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`fs-chrome__btn${historyPanelOpen ? ' fs-chrome__btn--active' : ''}`}
        aria-expanded={historyPanelOpen}
        aria-controls="fs-history-sidebar"
        onClick={() => toggleHistoryPanel()}
      >
        History
      </button>

      {historyPanelOpen && (
        <>
          <div
            className="fs-history-sidebar__backdrop"
            aria-hidden
            onClick={() => setHistoryPanelOpen(false)}
          />
          <aside
            id="fs-history-sidebar"
            ref={sidebarRef}
            className="fs-history-sidebar"
            aria-label="写作历史"
          >
            <header className="fs-history-sidebar__header">
              <h2 className="fs-history-sidebar__title">历史</h2>
              <button
                type="button"
                className="fs-history-sidebar__close"
                aria-label="关闭历史"
                onClick={() => setHistoryPanelOpen(false)}
              >
                ×
              </button>
            </header>

            {!session && (
              <p className="fs-history-sidebar__hint">
                登录信箱后可同步到云端、跨设备查看。
                <button type="button" className="fs-history-sidebar__link" onClick={openMailboxAuth}>
                  打开信箱登录
                </button>
              </p>
            )}

            {session && (
              <section className="fs-history-sidebar__section">
                <h3 className="fs-history-sidebar__section-title">云端</h3>
                {cloudHistoryError && (
                  <p className="fs-history-sidebar__error" role="alert">
                    {cloudHistoryError}
                  </p>
                )}
                {cloudHistoryLoading && cloudHistory.length === 0 ? (
                  <p className="fs-history-sidebar__empty">加载中…</p>
                ) : cloudHistory.length === 0 ? (
                  <p className="fs-history-sidebar__empty">暂无云端记录，可同步本地条目。</p>
                ) : (
                  <ul className="fs-history-sidebar__list">
                    {cloudHistory.map((e) => (
                      <HistoryListItem
                        key={e.id}
                        savedAt={e.savedAt}
                        preview={e.preview}
                        onSelect={() => void restoreFromCloud(e.id)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section className="fs-history-sidebar__section">
              <h3 className="fs-history-sidebar__section-title">
                {session ? '本机' : '本地'}
              </h3>
              {draftHistory.length === 0 ? (
                <p className="fs-history-sidebar__empty">尚无记录 — 按 SAVE 保存快照。</p>
              ) : (
                <ul className="fs-history-sidebar__list">
                  {draftHistory.map((e) => (
                    <HistoryListItem
                      key={e.id}
                      savedAt={e.savedAt}
                      preview={previewLine(e.text)}
                      onSelect={() => restoreDraftFromHistory(e.id)}
                    />
                  ))}
                </ul>
              )}
              {session && draftHistory.length > 0 && (
                <button
                  type="button"
                  className="fs-history-sidebar__sync"
                  disabled={historySyncing || cloudHistoryLoading}
                  onClick={() => void syncLocalToCloud()}
                >
                  {historySyncing ? '同步中…' : '同步本地记录到云端'}
                </button>
              )}
            </section>
          </aside>
        </>
      )}
    </>
  );
}
