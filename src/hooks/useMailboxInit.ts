import { useEffect } from 'react';
import { loadMailboxToken } from '../lib/mailboxSession';
import { useMailboxStore } from '../store/mailboxStore';

/** Restore session on load, Alt+L toggles MAIL panel. */
export function useMailboxInit() {
  const restoreSession = useMailboxStore((s) => s.restoreSession);
  const togglePanel = useMailboxStore((s) => s.togglePanel);

  useEffect(() => {
    if (loadMailboxToken()) void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key.toLowerCase() !== 'l') return;
      e.preventDefault();
      togglePanel();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [togglePanel]);

  useEffect(() => {
    const poll = () => {
      const state = useMailboxStore.getState();
      if (state.session && !state.panelOpen) void state.refreshLists();
    };
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, []);
}
