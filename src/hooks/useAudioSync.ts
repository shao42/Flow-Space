import { useEffect } from 'react';
import { useFlowStore } from '../store/flowStore';
import { getAudioEngine } from '../lib/audioEngine';

/** Push mixer + mode into Web Audio when store changes (no RAF). */
export function useAudioSync(): void {
  const mode = useFlowStore((s) => s.atmosphereMode);
  const mixer = useFlowStore((s) => s.mixer);

  useEffect(() => {
    getAudioEngine().apply(mode, mixer);
  }, [mode, mixer]);
}
