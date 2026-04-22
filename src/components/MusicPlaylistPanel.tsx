import { useEffect, useRef, useState } from 'react';
import { useFlowStore } from '../store/flowStore';
import { getAudioEngine } from '../lib/audioEngine';
import { fetchMusicManifest, type MusicManifest } from '../lib/musicPlaylist';

const RIGHT_EDGE_PX = 40;

function useRevealNearRightEdge() {
  const [reveal, setReveal] = useState(false);
  const [isCoarseOrNoHover] = useState(
    () => window.matchMedia('(hover: none), (pointer: coarse)').matches
  );
  const peekRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isCoarseOrNoHover) return;
    const onMove = (e: MouseEvent) => {
      const inStrip = e.clientX >= window.innerWidth - RIGHT_EDGE_PX;
      const onPeek = Boolean(peekRef.current?.contains(e.target as Node));
      setReveal(inStrip || onPeek);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [isCoarseOrNoHover]);

  return { reveal, peekRef, isCoarseOrNoHover };
}

export function MusicPlaylistPanel() {
  const selectedId = useFlowStore((s) => s.musicPlaylistTrackId);
  const setTrackId = useFlowStore((s) => s.setMusicPlaylistTrackId);
  const [manifest, setManifest] = useState<MusicManifest | null>(null);
  const [err, setErr] = useState(false);
  const { reveal, peekRef, isCoarseOrNoHover } = useRevealNearRightEdge();

  useEffect(() => {
    fetchMusicManifest()
      .then((m) => {
        setManifest(m);
        setErr(!m?.tracks?.length);
      })
      .catch(() => setErr(true));
  }, []);

  const pick = (id: string) => {
    getAudioEngine().unlock();
    setTrackId(id);
  };

  return (
    <div
      ref={peekRef}
      className={
        isCoarseOrNoHover ? 'fs-music-peek' : `fs-music-peek${reveal ? ' fs-music-peek--reveal' : ''}`
      }
    >
      <div className="fs-music-peek__edge" aria-hidden />
      <aside className="fs-music-playlist" aria-label="Music playlist">
        <h2 className="fs-music-playlist__title">Music</h2>
        {err && (
          <p className="fs-music-playlist__hint">
            Add tracks under <code>public/music-playlist/</code> and list them in <code>manifest.json</code>.
          </p>
        )}
        {manifest && manifest.tracks.length > 0 && (
          <ul className="fs-music-playlist__list">
            {manifest.tracks.map((t) => {
              const hasId = Boolean(selectedId && manifest.tracks.some((x) => x.id === selectedId));
              const effectiveId = hasId ? selectedId! : manifest.tracks[0].id;
              const active = t.id === effectiveId;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className={active ? 'fs-music-playlist__btn fs-music-playlist__btn--active' : 'fs-music-playlist__btn'}
                    onClick={() => pick(t.id)}
                  >
                    {t.title}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </div>
  );
}
