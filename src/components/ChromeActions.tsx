import { useFlowStore } from '../store/flowStore';
import { useMailboxStore } from '../store/mailboxStore';
import { HistoryToggleButton } from './HistoryToggleButton';

export function ChromeActions() {
  const saveNow = useFlowStore((s) => s.saveNow);
  const exportDraft = useFlowStore((s) => s.exportDraft);
  const setReleaseModalOpen = useFlowStore((s) => s.setReleaseModalOpen);
  const togglePanel = useMailboxStore((s) => s.togglePanel);
  const apiConfigured = useMailboxStore((s) => s.apiConfigured);
  const hasUnread = useMailboxStore((s) => s.hasUnread);

  return (
    <div className="fs-chrome">
      <button type="button" className="fs-chrome__btn" onClick={saveNow}>
        SAVE
      </button>
      <HistoryToggleButton />
      <button type="button" className="fs-chrome__btn" onClick={() => setReleaseModalOpen(true)}>
        RELEASE
      </button>
      <button type="button" className="fs-chrome__btn" onClick={exportDraft}>
        Export
      </button>
      <button
        type="button"
        className={`fs-chrome__btn fs-chrome__btn--mail${hasUnread ? ' fs-chrome__btn--mail-new' : ''}`}
        title={apiConfigured ? '信箱 (Alt+L)' : '信箱 (Alt+L) — API 未配置'}
        onClick={togglePanel}
      >
        MAIL
      </button>
    </div>
  );
}
