import { useEffect, useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import { FLOW_SPACE_AUDIO_UNLOCK, getAudioEngine } from '../lib/audioEngine';
import { fetchMusicManifest, fileForTrackId } from '../lib/musicPlaylist';

/** Push mixer, mode, and playlist track into Web Audio when store changes. */
export function useAudioSync(): void {
  const mode = useFlowStore((s) => s.atmosphereMode);
  const mixer = useFlowStore((s) => s.mixer);
  const trackId = useFlowStore((s) => s.musicPlaylistTrackId);
  const [bedFile, setBedFile] = useState<string | null>(null);
  const [audioUnlockGen, setAudioUnlockGen] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchMusicManifest().then((m) => {
      if (cancelled) return;
      setBedFile(fileForTrackId(m, trackId));
    });
    return () => {
      cancelled = true;
    };
  }, [trackId]);

  /** Browsers require a user gesture; first interaction anywhere will create the audio context. */
  useEffect(() => {
    const tryUnlock = () => {
      getAudioEngine().unlock();
    };
    const onDown = () => {
      tryUnlock();
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onDown, true);
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onDown, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onDown, true);
    };
  }, []);

  /** Re-apply when the engine first opens (first apply() on mount is a no-op before unlock). */
  useEffect(() => {
    const onUnlock = () => setAudioUnlockGen((n) => n + 1);
    window.addEventListener(FLOW_SPACE_AUDIO_UNLOCK, onUnlock);
    return () => window.removeEventListener(FLOW_SPACE_AUDIO_UNLOCK, onUnlock);
  }, []);

  useEffect(() => {
    getAudioEngine().setBedMusicFile(bedFile);
    getAudioEngine().apply(mode, mixer);
  }, [bedFile, mode, mixer, audioUnlockGen]);
}
