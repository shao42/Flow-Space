import { useEffect, useRef, useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import type { SettingsV1 } from '../lib/storage';
import { getAudioEngine } from '../lib/audioEngine';

function minutesFromConfig(t: SettingsV1['timer']): number {
  if (t.kind === 'preset') return t.presetMinutes ?? 25;
  return Math.min(180, Math.max(5, t.customMinutes ?? 25));
}

type Phase = 'idle' | 'running' | 'paused';

export function ZenTimer() {
  const timerCfg = useFlowStore((s) => s.timer);
  const setTimer = useFlowStore((s) => s.setTimer);
  const bumpDeckPulse = useFlowStore((s) => s.bumpDeckPulse);

  const [phase, setPhase] = useState<Phase>('idle');
  const [remainingSec, setRemainingSec] = useState(() => minutesFromConfig(timerCfg) * 60);
  const sessionTotalRef = useRef(minutesFromConfig(timerCfg) * 60);
  const completionLock = useRef(false);

  useEffect(() => {
    if (phase === 'idle') {
      completionLock.current = false;
      const next = minutesFromConfig(timerCfg) * 60;
      sessionTotalRef.current = next;
      setRemainingSec(next);
    }
  }, [timerCfg, phase]);

  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      setRemainingSec((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running' || remainingSec > 0) return;
    if (completionLock.current) return;
    completionLock.current = true;
    setPhase('idle');
    try {
      getAudioEngine().playZenCompleteChime();
    } catch {
      /* ignore */
    }
    bumpDeckPulse();
    const next = minutesFromConfig(useFlowStore.getState().timer) * 60;
    sessionTotalRef.current = next;
    setRemainingSec(next);
  }, [remainingSec, phase, bumpDeckPulse]);

  const ratio =
    sessionTotalRef.current > 0 ? Math.min(1, remainingSec / sessionTotalRef.current) : 0;

  const startOrResume = () => {
    if (phase === 'idle') {
      const t = minutesFromConfig(useFlowStore.getState().timer) * 60;
      sessionTotalRef.current = t;
      setRemainingSec(t);
      setPhase('running');
    } else if (phase === 'paused') {
      setPhase('running');
    }
  };

  const pause = () => setPhase('paused');

  const reset = () => {
    setPhase('idle');
    const t = minutesFromConfig(useFlowStore.getState().timer) * 60;
    sessionTotalRef.current = t;
    setRemainingSec(t);
  };

  const customVal = timerCfg.kind === 'custom' ? (timerCfg.customMinutes ?? 25) : 25;

  return (
    <div className="fs-zen" role="region" aria-label="心流计时器">
      <div className="fs-zen__presets">
        {([15, 25, 45] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={
              timerCfg.kind === 'preset' && timerCfg.presetMinutes === m
                ? 'fs-zen__chip fs-zen__chip--on'
                : 'fs-zen__chip'
            }
            onClick={() => {
              setTimer({ kind: 'preset', presetMinutes: m });
              setPhase('idle');
            }}
          >
            {m}m
          </button>
        ))}
        <button
          type="button"
          className={
            timerCfg.kind === 'custom' ? 'fs-zen__chip fs-zen__chip--on' : 'fs-zen__chip'
          }
          onClick={() => {
            setTimer({ kind: 'custom', customMinutes: 25 });
            setPhase('idle');
          }}
        >
          Custom
        </button>
      </div>
      {timerCfg.kind === 'custom' && (
        <label className="fs-zen__custom">
          分钟 (5–180)
          <input
            type="number"
            min={5}
            max={180}
            value={customVal}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isNaN(v)) return;
              setTimer({
                kind: 'custom',
                customMinutes: Math.min(180, Math.max(5, Math.round(v))),
              });
            }}
          />
        </label>
      )}
      <div
        className="fs-zen__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <div className="fs-zen__bar-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="fs-zen__time">{formatClock(remainingSec)}</div>
      <div className="fs-zen__actions">
        <button type="button" onClick={startOrResume} disabled={phase === 'running'}>
          Start
        </button>
        <button type="button" onClick={pause} disabled={phase !== 'running'}>
          Pause
        </button>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
