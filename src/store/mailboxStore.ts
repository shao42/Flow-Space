import { create } from 'zustand';
import {
  deleteLetter,
  fetchInbox,
  fetchLetter,
  fetchMe,
  fetchSent,
  isMailboxApiConfigured,
  login,
  logoutLocal,
  register,
  searchUsers,
  sendLetter,
} from '../lib/mailboxApi';
import { loadMailboxToken, loadMailboxUser } from '../lib/mailboxSession';
import { MailboxApiError, type Letter, type LetterListItem, type MailboxUser } from '../lib/mailboxTypes';
import type { AtmosphereMode } from '../lib/storage';

const POLL_MS = 30_000;

export type MailboxView = 'auth' | 'inbox' | 'sent' | 'compose' | 'read';
export type AuthMode = 'login' | 'register';

export type MailboxState = {
  panelOpen: boolean;
  view: MailboxView;
  authMode: AuthMode;
  session: MailboxUser | null;
  inbox: LetterListItem[];
  sent: LetterListItem[];
  activeLetter: Letter | null;
  loading: boolean;
  error: string | null;
  hasUnread: boolean;
  pollTimer: ReturnType<typeof setInterval> | null;

  authUsername: string;
  authPassword: string;
  composeTo: string;
  composeSubject: string;
  composeText: string;
  attachAtmosphere: boolean;
  searchHits: { username: string; displayName: string }[];

  apiConfigured: boolean;

  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setView: (view: MailboxView) => void;
  setAuthMode: (mode: AuthMode) => void;
  setAuthUsername: (v: string) => void;
  setAuthPassword: (v: string) => void;
  setComposeTo: (v: string) => void;
  setComposeSubject: (v: string) => void;
  setComposeText: (v: string) => void;
  setAttachAtmosphere: (v: boolean) => void;
  clearError: () => void;

  restoreSession: () => Promise<void>;
  submitAuth: () => Promise<void>;
  logout: () => void;
  refreshLists: () => Promise<void>;
  openLetter: (id: string) => Promise<void>;
  openCompose: (toUsername?: string) => void;
  runUserSearch: (q: string) => Promise<void>;
  sendCompose: (atmosphereMode?: AtmosphereMode) => Promise<void>;
  fillComposeFromDraft: (text: string) => void;
  recallLetter: () => Promise<void>;
  deleteFromInbox: () => Promise<void>;
};

function errorMessage(e: unknown): string {
  if (e instanceof MailboxApiError) return e.message;
  if (e instanceof Error) return e.message;
  return '未知错误';
}

export const useMailboxStore = create<MailboxState>((set, get) => {
  const stopPoll = () => {
    const t = get().pollTimer;
    if (t) clearInterval(t);
    set({ pollTimer: null });
  };

  const startPoll = () => {
    stopPoll();
    const t = setInterval(() => {
      if (get().panelOpen && get().session) void get().refreshLists();
    }, POLL_MS);
    set({ pollTimer: t });
  };

  return {
    panelOpen: false,
    view: 'auth',
    authMode: 'login',
    session: loadMailboxToken() ? loadMailboxUser() : null,
    inbox: [],
    sent: [],
    activeLetter: null,
    loading: false,
    error: null,
    hasUnread: false,
    pollTimer: null,

    authUsername: '',
    authPassword: '',
    composeTo: '',
    composeSubject: '',
    composeText: '',
    attachAtmosphere: false,
    searchHits: [],

    apiConfigured: isMailboxApiConfigured(),

    setPanelOpen: (open) => {
      if (open) {
        set({ apiConfigured: isMailboxApiConfigured() });
        void get().restoreSession();
        startPoll();
      } else {
        stopPoll();
      }
      set({ panelOpen: open });
    },

    togglePanel: () => get().setPanelOpen(!get().panelOpen),

    setView: (view) => {
      set({ view, activeLetter: view === 'read' ? get().activeLetter : null });
      if (view === 'inbox' || view === 'sent') void get().refreshLists();
    },

    setAuthMode: (mode) => set({ authMode: mode, error: null }),
    setAuthUsername: (v) => set({ authUsername: v }),
    setAuthPassword: (v) => set({ authPassword: v }),
    setComposeTo: (v) => set({ composeTo: v }),
    setComposeSubject: (v) => set({ composeSubject: v }),
    setComposeText: (v) => set({ composeText: v }),
    setAttachAtmosphere: (v) => set({ attachAtmosphere: v }),
    clearError: () => set({ error: null }),

    restoreSession: async () => {
      const token = loadMailboxToken();
      if (!token) {
        set({ session: null, view: 'auth' });
        return;
      }
      set({ loading: true, error: null });
      try {
        const user = await fetchMe();
        set({ session: user, view: 'inbox', loading: false });
        await get().refreshLists();
      } catch {
        logoutLocal();
        set({ session: null, view: 'auth', loading: false });
      }
    },

    submitAuth: async () => {
      const username = get().authUsername.trim().toLowerCase();
      const password = get().authPassword;
      if (!username || !password) {
        set({ error: '请填写用户名和密码' });
        return;
      }
      set({ loading: true, error: null });
      try {
        const { user } =
          get().authMode === 'register'
            ? await register(username, password)
            : await login(username, password);
        set({
          session: user,
          view: 'inbox',
          loading: false,
          authPassword: '',
        });
        await get().refreshLists();
      } catch (e) {
        set({ loading: false, error: errorMessage(e) });
      }
    },

    logout: () => {
      logoutLocal();
      stopPoll();
      set({
        session: null,
        view: 'auth',
        inbox: [],
        sent: [],
        activeLetter: null,
        hasUnread: false,
        authPassword: '',
      });
    },

    refreshLists: async () => {
      if (!get().session) return;
      set({ loading: true, error: null });
      try {
        const [inbox, sent] = await Promise.all([fetchInbox(), fetchSent()]);
        const hasUnread = inbox.some((l) => l.unread);
        set({ inbox, sent, hasUnread, loading: false });
      } catch (e) {
        if (e instanceof MailboxApiError && e.code === 'UNAUTHORIZED') {
          get().logout();
        } else {
          set({ loading: false, error: errorMessage(e) });
        }
      }
    },

    openLetter: async (id) => {
      set({ loading: true, error: null, view: 'read' });
      try {
        const letter = await fetchLetter(id);
        set({ activeLetter: letter, loading: false });
        await get().refreshLists();
      } catch (e) {
        set({ loading: false, error: errorMessage(e) });
      }
    },

    openCompose: (toUsername) => {
      set({
        view: 'compose',
        composeTo: toUsername ?? '',
        composeSubject: '',
        searchHits: [],
        activeLetter: null,
      });
    },

    runUserSearch: async (q) => {
      const trimmed = q.trim().toLowerCase();
      if (trimmed.length < 1) {
        set({ searchHits: [] });
        return;
      }
      try {
        const users = await searchUsers(trimmed);
        set({ searchHits: users });
      } catch {
        set({ searchHits: [] });
      }
    },

    sendCompose: async (atmosphereMode) => {
      const toUsername = get().composeTo.trim().toLowerCase();
      const body = get().composeText.trim();
      if (!toUsername) {
        set({ error: '请填写收件人用户名' });
        return;
      }
      if (body.length < 1 || body.length > 20000) {
        set({ error: '正文长度须在 1–20000 字符' });
        return;
      }
      set({ loading: true, error: null });
      try {
        await sendLetter({
          toUsername,
          subject: get().composeSubject.trim() || undefined,
          body,
          atmosphereMode: get().attachAtmosphere ? atmosphereMode : undefined,
        });
        set({
          composeText: '',
          composeSubject: '',
          composeTo: '',
          loading: false,
          view: 'sent',
        });
        await get().refreshLists();
      } catch (e) {
        set({ loading: false, error: errorMessage(e) });
      }
    },

    fillComposeFromDraft: (text) => {
      set({ composeText: text, view: 'compose' });
    },

    recallLetter: async () => {
      const letter = get().activeLetter;
      if (!letter || letter.fromUserId !== get().session?.id) return;
      set({ loading: true, error: null });
      try {
        await deleteLetter(letter.id);
        set({ loading: false, view: 'sent', activeLetter: null });
        await get().refreshLists();
      } catch (e) {
        set({ loading: false, error: errorMessage(e) });
      }
    },

    deleteFromInbox: async () => {
      const letter = get().activeLetter;
      if (!letter || letter.toUserId !== get().session?.id) return;
      set({ loading: true, error: null });
      try {
        await deleteLetter(letter.id);
        set({ loading: false, view: 'inbox', activeLetter: null });
        await get().refreshLists();
      } catch (e) {
        set({ loading: false, error: errorMessage(e) });
      }
    },
  };
});
