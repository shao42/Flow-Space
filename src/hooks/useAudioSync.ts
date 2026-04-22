import { useEffect, useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import { getAudioEngine } from '../lib/audioEngine';
import { fetchMusicManifest, fileForTrackId } from '../lib/musicPlaylist';

/** Push mixer, mode, and playlist track into Web Audio when store changes. */
export function useAudioSync(): void {
  const mode = useFlowStore((s) => s.atmosphereMode);
  const mixer = useFlowStore((s) => s.mixer);
  const trackId = useFlowStore((s) => s.musicPlaylistTrackId);
  const [bedFile, setBedFile] = useState<string | null>(null);

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

  useEffect(() => {
    getAudioEngine().setBedMusicFile(bedFile);
    getAudioEngine().apply(mode, mixer);
  }, [bedFile, mode, mixer]);
}
