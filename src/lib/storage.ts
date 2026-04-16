import type { SnowBackgroundId } from './snowBackgrounds';
import { DEFAULT_SNOW_BACKGROUND, isSnowBackgroundId } from './snowBackgrounds';

export const DRAFT_KEY = 'flowspace:v1:draft';
export const SETTINGS_KEY = 'flowspace:v1:settings';

export type AtmosphereMode = 'rain' | 'snow';

export type { SnowBackgroundId };

/** `2` = mixer defaults reset policy (see `migrateSettings`). */
export interface SettingsV1 {
  version: 1 | 2;
  atmosphereMode: AtmosphereMode;
  snowBackgroundId: SnowBackgroundId;
  alwaysShowControls: boolean;
  fontIndex: number;
  mixer: {
    intensity01: number;
    blurPx: number;
    noise01: number;
    musicBlend01: number;
  };
  timer: {
    kind: 'preset' | 'custom';
    presetMinutes?: 15 | 25 | 45;
    customMinutes?: number;
  };
}

export function defaultSettings(): SettingsV1 {
  return {
    version: 2,
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
    timer: {
      kind: 'preset',
      presetMinutes: 25,
    },
  };
}

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): { ok: true } | { ok: false; reason: string } {
  try {
    if (typeof localStorage === 'undefined') {
      return { ok: false, reason: 'unavailable' };
    }
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      return { ok: false, reason: 'quota' };
    }
    return { ok: false, reason: 'error' };
  }
}

export function migrateSettings(raw: unknown): SettingsV1 {
  const base = defaultSettings();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const storedVersion = o.version === 2 ? 2 : typeof o.version === 'number' ? o.version : 1;
  const partial = parsePartialSettings(o);
  const merged: SettingsV1 = { ...base, ...partial };
  if (storedVersion < 2) {
    merged.mixer = { ...base.mixer };
  }
  merged.version = 2;
  return merged;
}

function parsePartialSettings(o: Record<string, unknown>): Partial<SettingsV1> {
  const out: Partial<SettingsV1> = {};
  if (o.atmosphereMode === 'rain' || o.atmosphereMode === 'snow') {
    out.atmosphereMode = o.atmosphereMode;
  } else if (o.atmosphereMode === 'still') {
    out.atmosphereMode = 'rain';
  }
  if (isSnowBackgroundId(o.snowBackgroundId)) {
    out.snowBackgroundId = o.snowBackgroundId;
  }
  if (typeof o.alwaysShowControls === 'boolean') {
    out.alwaysShowControls = o.alwaysShowControls;
  }
  if (typeof o.fontIndex === 'number' && o.fontIndex >= 0 && o.fontIndex <= 2) {
    out.fontIndex = o.fontIndex;
  }
  if (o.mixer && typeof o.mixer === 'object') {
    const m = o.mixer as Record<string, unknown>;
    out.mixer = {
      intensity01: clamp01(m.intensity01, defaultSettings().mixer.intensity01),
      blurPx: clampBlur(m.blurPx, defaultSettings().mixer.blurPx),
      noise01: clamp01(m.noise01, defaultSettings().mixer.noise01),
      musicBlend01: clamp01(m.musicBlend01, defaultSettings().mixer.musicBlend01),
    };
  }
  if (o.timer && typeof o.timer === 'object') {
    const t = o.timer as Record<string, unknown>;
    if (t.kind === 'preset' && (t.presetMinutes === 15 || t.presetMinutes === 25 || t.presetMinutes === 45)) {
      out.timer = { kind: 'preset', presetMinutes: t.presetMinutes };
    } else if (t.kind === 'custom' && typeof t.customMinutes === 'number') {
      const c = Math.min(180, Math.max(5, Math.round(t.customMinutes)));
      out.timer = { kind: 'custom', customMinutes: c };
    }
  }
  return out;
}

function clamp01(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return fallback;
  return Math.min(1, Math.max(0, v));
}

function clampBlur(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return fallback;
  return Math.min(48, Math.max(8, Math.round(v)));
}

export function loadSettings(): { settings: SettingsV1; error?: string } {
  const raw = safeGetItem(SETTINGS_KEY);
  if (raw == null) return { settings: defaultSettings() };
  try {
    const parsed = JSON.parse(raw) as unknown;
    return { settings: { ...defaultSettings(), ...migrateSettings(parsed) } };
  } catch {
    return { settings: defaultSettings(), error: 'corrupt' };
  }
}

export function saveSettings(settings: SettingsV1): { ok: true } | { ok: false; reason: string } {
  const payload = JSON.stringify(settings);
  return safeSetItem(SETTINGS_KEY, payload);
}

export function loadDraft(): string {
  return safeGetItem(DRAFT_KEY) ?? '';
}

export function saveDraft(text: string): { ok: true } | { ok: false; reason: string } {
  return safeSetItem(DRAFT_KEY, text);
}

export function clearDraft(): { ok: true } | { ok: false; reason: string } {
  try {
    if (typeof localStorage === 'undefined') {
      return { ok: false, reason: 'unavailable' };
    }
    localStorage.removeItem(DRAFT_KEY);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
