import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SETTINGS_KEY,
  loadSettings,
  saveSettings,
  loadDraft,
  saveDraft,
  clearDraft,
  migrateSettings,
  defaultSettings,
  type SettingsV1,
} from './storage';

function mockStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    _dump: () => store,
  };
}

describe('storage', () => {
  beforeEach(() => {
    const m = mockStorage();
    vi.stubGlobal('localStorage', m);
  });

  it('roundtrips settings', () => {
    const s: SettingsV1 = {
      ...defaultSettings(),
      atmosphereMode: 'snow',
      fontIndex: 2,
    };
    expect(saveSettings(s).ok).toBe(true);
    const { settings } = loadSettings();
    expect(settings.atmosphereMode).toBe('snow');
    expect(settings.fontIndex).toBe(2);
  });

  it('roundtrips draft', () => {
    expect(saveDraft('hello').ok).toBe(true);
    expect(loadDraft()).toBe('hello');
    expect(clearDraft().ok).toBe(true);
    expect(loadDraft()).toBe('');
  });

  it('migrateSettings from empty object uses defaults', () => {
    const m = migrateSettings({});
    expect(m.version).toBe(2);
    expect(m.atmosphereMode).toBe('rain');
    expect(m.snowBackgroundId).toBe('mountain_forest');
  });

  it('migrates v1 stored settings to v2 mixer defaults', () => {
    const m = migrateSettings({
      version: 1,
      mixer: {
        intensity01: 1,
        blurPx: 24,
        noise01: 0.5,
        musicBlend01: 0.5,
      },
    });
    expect(m.version).toBe(2);
    expect(m.mixer).toEqual(defaultSettings().mixer);
  });

  it('migrateSettings maps removed still mode to rain', () => {
    const m = migrateSettings({ atmosphereMode: 'still' });
    expect(m.atmosphereMode).toBe('rain');
  });

  it('corrupt JSON yields defaults with error flag', () => {
    localStorage.setItem(SETTINGS_KEY, '{');
    const { settings, error } = loadSettings();
    expect(settings.version).toBe(2);
    expect(error).toBe('corrupt');
  });

  it('QuotaExceededError on draft save returns failure', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      },
      removeItem: vi.fn(),
    });
    const r = saveDraft('x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('quota');
  });
});
