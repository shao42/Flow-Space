export interface MusicManifestTrack {
  id: string;
  title: string;
  file: string;
}

export interface MusicManifest {
  tracks: MusicManifestTrack[];
}

let manifestCache: MusicManifest | null = null;
let loadPromise: Promise<MusicManifest | null> | null = null;

export function musicPlaylistBaseUrl(): string {
  return `${import.meta.env.BASE_URL}music-playlist/`;
}

export function trackUrl(file: string): string {
  return `${musicPlaylistBaseUrl()}${encodeURIComponent(file)}`;
}

/** Cached fetch; safe to call from many components. */
export function fetchMusicManifest(): Promise<MusicManifest | null> {
  if (manifestCache) return Promise.resolve(manifestCache);
  if (loadPromise) return loadPromise;
  loadPromise = fetch(`${import.meta.env.BASE_URL}music-playlist/manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<MusicManifest>) : null))
    .then((m) => {
      if (m && Array.isArray(m.tracks)) {
        manifestCache = m;
        return m;
      }
      return null;
    })
    .catch(() => null);
  return loadPromise;
}

/** Resolve the `file` field for a stored track id; empty id → first track. */
export function fileForTrackId(manifest: MusicManifest | null, trackId: string): string | null {
  if (!manifest?.tracks?.length) return null;
  if (!trackId) return manifest.tracks[0].file;
  const t = manifest.tracks.find((x) => x.id === trackId);
  return t?.file ?? manifest.tracks[0].file;
}
