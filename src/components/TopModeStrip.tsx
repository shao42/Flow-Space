import { useCallback, useEffect, useRef, useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import { SNOW_BACKGROUND_OPTIONS, type SnowBackgroundId } from '../lib/snowBackgrounds';

export function TopModeStrip() {
  const mode = useFlowStore((s) => s.atmosphereMode);
  const setMode = useFlowStore((s) => s.setAtmosphereMode);
  const snowBackgroundId = useFlowStore((s) => s.snowBackgroundId);
  const setSnowBackgroundId = useFlowStore((s) => s.setSnowBackgroundId);
  const alwaysShow = useFlowStore((s) => s.alwaysShowControls);

  const [hoverTop, setHoverTop] = useState(false);
  const [snowPickerOpen, setSnowPickerOpen] = useState(false);
  const snowLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cycleMode = useCallback(() => {
    const order = ['rain', 'snow', 'kk11'] as const;
    const i = order.indexOf(mode);
    setMode(order[i === -1 ? 0 : (i + 1) % order.length]);
  }, [mode, setMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        cycleMode();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [cycleMode]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      setHoverTop(e.clientY <= 50);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const visible = alwaysShow || hoverTop || snowPickerOpen;

  const openSnowPicker = useCallback(() => {
    if (snowLeaveTimer.current) {
      clearTimeout(snowLeaveTimer.current);
      snowLeaveTimer.current = null;
    }
    setSnowPickerOpen(true);
  }, []);

  const scheduleCloseSnowPicker = useCallback(() => {
    if (snowLeaveTimer.current) clearTimeout(snowLeaveTimer.current);
    snowLeaveTimer.current = setTimeout(() => setSnowPickerOpen(false), 160);
  }, []);

  const pickSnowBg = useCallback(
    (id: SnowBackgroundId) => {
      setSnowBackgroundId(id);
      setMode('snow');
      setSnowPickerOpen(true);
    },
    [setSnowBackgroundId, setMode]
  );

  return (
    <div
      className={`fs-top-strip ${visible ? 'fs-top-strip--visible' : ''}`}
      role="toolbar"
      aria-label="氛围模式"
    >
      <button
        type="button"
        className={mode === 'rain' ? 'fs-mode fs-mode--active' : 'fs-mode'}
        onClick={() => setMode('rain')}
      >
        Rain
      </button>
      <span className="fs-mode-sep" aria-hidden>
        |
      </span>
      <div
        className="fs-snow-cell"
        onMouseEnter={openSnowPicker}
        onMouseLeave={scheduleCloseSnowPicker}
      >
        <button
          type="button"
          className={mode === 'snow' ? 'fs-mode fs-mode--active' : 'fs-mode'}
          onClick={() => setMode('snow')}
          aria-haspopup="listbox"
          aria-expanded={snowPickerOpen}
        >
          Snow
        </button>
        {snowPickerOpen && (
          <div
            className="fs-snow-picker"
            role="listbox"
            aria-label="Snow background"
            onMouseEnter={openSnowPicker}
          >
            {SNOW_BACKGROUND_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={snowBackgroundId === opt.id}
                className={snowBackgroundId === opt.id ? 'fs-snow-picker--active' : ''}
                onClick={() => pickSnowBg(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="fs-mode-sep" aria-hidden>
        |
      </span>
      <button
        type="button"
        className={mode === 'kk11' ? 'fs-mode fs-mode--active' : 'fs-mode'}
        onClick={() => setMode('kk11')}
      >
        KK11
      </button>
    </div>
  );
}
