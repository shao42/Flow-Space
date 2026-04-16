import { useCallback, useEffect, useRef, useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import { getAudioEngine } from '../lib/audioEngine';

export function VibeMixer() {
  const mode = useFlowStore((s) => s.atmosphereMode);
  const mixer = useFlowStore((s) => s.mixer);
  const setMixer = useFlowStore((s) => s.setMixer);
  const alwaysShow = useFlowStore((s) => s.alwaysShowControls);
  const setAlwaysShow = useFlowStore((s) => s.setAlwaysShowControls);
  const setMode = useFlowStore((s) => s.setAtmosphereMode);

  const [open, setOpen] = useState(false);
  const handleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const openMixer = useCallback(() => {
    getAudioEngine().unlock();
    setOpen(true);
  }, []);

  const toggleMixer = useCallback(() => {
    if (open) setOpen(false);
    else openMixer();
  }, [open, openMixer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        toggleMixer();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [toggleMixer]);

  useEffect(() => {
    if (!open) return;
    const inside = (root: HTMLElement | null, e: PointerEvent) => {
      if (!root) return false;
      const t = e.target as Node | null;
      if (t && root.contains(t)) return true;
      return typeof e.composedPath === 'function' && e.composedPath().includes(root);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (inside(handleRef.current, e)) return;
      if (inside(panelRef.current, e)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  const intensityLabel = mode === 'rain' ? 'Rain intensity' : 'Snow density';

  return (
    <>
      <button
        ref={handleRef}
        type="button"
        className="fs-mixer-handle"
        aria-expanded={open}
        aria-controls="fs-vibe-mixer"
        aria-label="氛围控制台"
        tabIndex={0}
        onClick={() => {
          if (!open) openMixer();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!open) openMixer();
          }
        }}
      >
        <span className="fs-mixer-handle__bar" />
        <span className="fs-mixer-handle__bar" />
        <span className="fs-mixer-handle__bar" />
      </button>

        {open && (
        <div
          ref={panelRef}
          id="fs-vibe-mixer"
          className="fs-mixer-panel"
          role="dialog"
          aria-label="Vibe mixer"
        >
          <div className="fs-mixer-row fs-mixer-row--modes">
            <button
              type="button"
              className={mode === 'rain' ? 'fs-mode fs-mode--active' : 'fs-mode'}
              onClick={() => setMode('rain')}
            >
              Rain
            </button>
            <span className="fs-mode-sep">|</span>
            <button
              type="button"
              className={mode === 'snow' ? 'fs-mode fs-mode--active' : 'fs-mode'}
              onClick={() => setMode('snow')}
            >
              Snow
            </button>
          </div>

          <label className="fs-mixer-label">
            {intensityLabel}{' '}
            <span className="fs-mixer-val">{Math.round(mixer.intensity01 * 100)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(mixer.intensity01 * 100)}
            onChange={(e) => setMixer({ intensity01: Number(e.target.value) / 100 })}
          />

          <label className="fs-mixer-label">
            Deck blur <span className="fs-mixer-val">{mixer.blurPx}px</span>
          </label>
          <input
            type="range"
            min={8}
            max={48}
            value={mixer.blurPx}
            onChange={(e) => setMixer({ blurPx: Number(e.target.value) })}
          />

          <label className="fs-mixer-label">
            White noise <span className="fs-mixer-val">{Math.round(mixer.noise01 * 100)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(mixer.noise01 * 100)}
            onChange={(e) => setMixer({ noise01: Number(e.target.value) / 100 })}
          />

          <label className="fs-mixer-label">
            Music blend <span className="fs-mixer-val">{Math.round(mixer.musicBlend01 * 100)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(mixer.musicBlend01 * 100)}
            onChange={(e) => setMixer({ musicBlend01: Number(e.target.value) / 100 })}
          />

          <label className="fs-mixer-footer">
            <input
              type="checkbox"
              checked={alwaysShow}
              onChange={(e) => setAlwaysShow(e.target.checked)}
            />
            Always show controls
          </label>
        </div>
      )}
    </>
  );
}
