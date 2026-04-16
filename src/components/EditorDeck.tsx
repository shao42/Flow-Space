import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useFlowStore } from '../store/flowStore';
import { getAudioEngine } from '../lib/audioEngine';
import { ChromeActions } from './ChromeActions';

const PLACEHOLDER = '开始你的心流写作…';

export function EditorDeck() {
  const draftText = useFlowStore((s) => s.draftText);
  const setDraftText = useFlowStore((s) => s.setDraftText);
  const fontIndex = useFlowStore((s) => s.fontIndex);
  const cycleFont = useFlowStore((s) => s.cycleFont);
  const blurPx = useFlowStore((s) => s.mixer.blurPx);
  const deckPulseNonce = useFlowStore((s) => s.deckPulseNonce);

  const [pulse, setPulse] = useState(false);
  const unlocked = useRef(false);

  useEffect(() => {
    if (deckPulseNonce === 0) return;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 1400);
    return () => window.clearTimeout(t);
  }, [deckPulseNonce]);

  const unlockOnce = () => {
    if (unlocked.current) return;
    unlocked.current = true;
    getAudioEngine().unlock();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        cycleFont();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [cycleFont]);

  const style = {
    '--deck-blur': `${blurPx}px`,
  } as CSSProperties;

  return (
    <div className="fs-deck-outer">
      <div
        className={`fs-deck fs-font-${fontIndex} ${pulse ? 'fs-deck--pulse' : ''}`}
        style={style}
      >
        <button
          type="button"
          className="fs-font-cycle"
          aria-label="切换字体 Alt+F"
          title="切换字体 (Alt+F)"
          onClick={() => cycleFont()}
        >
          字
        </button>
        <textarea
          className="fs-editor"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onKeyDown={() => unlockOnce()}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          aria-label="正文"
        />
        <ChromeActions />
      </div>
    </div>
  );
}
