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
        onClick={() => toggleMixer()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleMixer();
          }
        }}
      >
        <span className="fs-mixer-handle__bar" />
        <span className="fs-mixer-handle__bar" />
        <span className="fs-mixer-handle__bar" />
      </button>

      {open && (
        <div
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

          <p className="fs-mixer-hint">音乐层使用 public/audio/ 中的曲目（见 audioEngine）</p>

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
