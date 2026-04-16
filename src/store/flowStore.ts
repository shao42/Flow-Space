import { create } from 'zustand';
import {
  loadDraft,
  saveDraft,
  loadSettings,
  saveSettings,
  clearDraft,
  type SettingsV1,
  type AtmosphereMode,
  type SnowBackgroundId,
} from '../lib/storage';
import { DEFAULT_SNOW_BACKGROUND } from '../lib/snowBackgrounds';
import { buildExportFilename, downloadTextFile } from '../lib/exportDraft';

export type FlowState = {
  draftText: string;
  atmosphereMode: AtmosphereMode;
  snowBackgroundId: SnowBackgroundId;
  alwaysShowControls: boolean;
  fontIndex: number;
  mixer: SettingsV1['mixer'];
  timer: SettingsV1['timer'];
  storageError: string | null;
  saveToast: string | null;
  releaseModalOpen: boolean;
  hydrated: boolean;
  /** Bumped when Zen timer completes — deck can pulse once */
  deckPulseNonce: number;

  setDraftText: (text: string) => void;
  setAtmosphereMode: (m: AtmosphereMode) => void;
  setSnowBackgroundId: (id: SnowBackgroundId) => void;
  setAlwaysShowControls: (v: boolean) => void;
  cycleFont: () => void;
  setMixer: (partial: Partial<SettingsV1['mixer']>) => void;
  setTimer: (t: SettingsV1['timer']) => void;
  clearStorageError: () => void;
  setReleaseModalOpen: (v: boolean) => void;
  hydrate: () => void;
  persistSettings: () => void;
  saveNow: () => void;
  confirmRelease: () => void;
  exportDraft: () => void;
  bumpDeckPulse: () => void;
};

const STORAGE_FAIL_MSG = '无法写入本地存储 — 请尽快导出备份';

function mergeSettingsIntoStore(s: SettingsV1): Pick<
  FlowState,
  | 'atmosphereMode'
  | 'snowBackgroundId'
  | 'alwaysShowControls'
  | 'fontIndex'
  | 'mixer'
  | 'timer'
> {
  return {
    atmosphereMode: s.atmosphereMode,
    snowBackgroundId: s.snowBackgroundId,
    alwaysShowControls: s.alwaysShowControls,
    fontIndex: s.fontIndex,
    mixer: { ...s.mixer },
    timer: { ...s.timer },
  };
}

let draftDebounce: ReturnType<typeof setTimeout> | undefined;

function scheduleDraftSave(getText: () => string, onFail: (reason: string) => void) {
  if (draftDebounce) clearTimeout(draftDebounce);
  draftDebounce = setTimeout(() => {
    const r = saveDraft(getText());
    if (!r.ok) onFail(r.reason);
  }, 300);
}

function buildSettingsFromState(s: FlowState): SettingsV1 {
  return {
    version: 2,
    atmosphereMode: s.atmosphereMode,
    snowBackgroundId: s.snowBackgroundId,
    alwaysShowControls: s.alwaysShowControls,
    fontIndex: s.fontIndex,
    mixer: { ...s.mixer },
    timer: { ...s.timer },
  };
}

export const useFlowStore = create<FlowState>((set, get) => ({
  draftText: '',
  atmosphereMode: 'rain',
  snowBackgroundId: DEFAULT_SNOW_BACKGROUND,
  alwaysShowControls: false,
  fontIndex: 0,
  mixer: {
    intensity01: 0.3,
    blurPx: 25,
    noise01: 0,
    musicBlend01: 0.5,
  },
  timer: { kind: 'preset', presetMinutes: 25 },
  storageError: null,
  saveToast: null,
  releaseModalOpen: false,
  hydrated: false,
  deckPulseNonce: 0,

  setDraftText: (text) => {
    set({ draftText: text });
    scheduleDraftSave(
      () => get().draftText,
      (reason) => set({ storageError: `${STORAGE_FAIL_MSG} (${reason})` })
    );
  },

  setAtmosphereMode: (m) => {
    set({ atmosphereMode: m });
    get().persistSettings();
  },

  setSnowBackgroundId: (id) => {
    set({ snowBackgroundId: id });
    get().persistSettings();
  },

  setAlwaysShowControls: (v) => {
    set({ alwaysShowControls: v });
    get().persistSettings();
  },

  cycleFont: () => {
    set((state) => ({ fontIndex: (state.fontIndex + 1) % 3 }));
    get().persistSettings();
  },

  setMixer: (partial) => {
    set((state) => ({ mixer: { ...state.mixer, ...partial } }));
    get().persistSettings();
  },

  setTimer: (t) => {
    set({ timer: { ...t } });
    get().persistSettings();
  },

  clearStorageError: () => set({ storageError: null }),

  setReleaseModalOpen: (v) => set({ releaseModalOpen: v }),

  hydrate: () => {
    const { settings, error } = loadSettings();
    const draft = loadDraft();
    set({
      ...mergeSettingsIntoStore(settings),
      draftText: draft,
      storageError: error === 'corrupt' ? '设置已重置（存储数据损坏）' : null,
      hydrated: true,
    });
  },

  persistSettings: () => {
    const r = saveSettings(buildSettingsFromState(get()));
    if (!r.ok) {
      set({ storageError: `${STORAGE_FAIL_MSG} (${r.reason})` });
    }
  },

  saveNow: () => {
    const r = saveDraft(get().draftText);
    if (!r.ok) {
      set({ storageError: `${STORAGE_FAIL_MSG} (${r.reason})` });
      return;
    }
    get().persistSettings();
    set({ saveToast: '已保存' });
    setTimeout(() => {
      if (get().saveToast === '已保存') set({ saveToast: null });
    }, 2000);
  },

  confirmRelease: () => {
    set({ draftText: '' });
    const d = clearDraft();
    if (!d.ok) {
      set({ storageError: `${STORAGE_FAIL_MSG} (${d.reason})` });
    }
    get().persistSettings();
    set({ releaseModalOpen: false });
  },

  exportDraft: () => {
    const name = buildExportFilename(new Date());
    downloadTextFile(get().draftText, name);
  },

  bumpDeckPulse: () => set((s) => ({ deckPulseNonce: s.deckPulseNonce + 1 })),
}));
