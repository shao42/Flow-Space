import { useEffect, useRef, type CSSProperties } from 'react';

const KK11_SRC = `${import.meta.env.BASE_URL}kk11_bg.mp4`;

type Props = {
  intensity01: number;
  reducedMotion: boolean;
};

/**
 * Looped background video for KK11 mode. Watermark is mitigated via CSS (see index.css: scale + clip),
 * not by editing the file; for a perfectly clean file, re-encode the mp4 without the mark.
 */
export function Kk11VideoBg({ intensity01, reducedMotion }: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (reducedMotion) {
      v.pause();
      v.currentTime = 0;
      return;
    }
    v.play().catch(() => {
      /* autoplay may be blocked; user interaction elsewhere unlocks the page */
    });
  }, [reducedMotion]);

  const brightness = 0.8 + 0.2 * intensity01;

  return (
    <div
      className="fs-kk11-bg"
      aria-hidden
      style={{ '--fs-kk11-brightness': String(brightness) } as CSSProperties}
    >
      <div className="fs-kk11-bg__frame">
        <video
          ref={ref}
          className="fs-kk11-bg__video"
          src={KK11_SRC}
          autoPlay
          playsInline
          loop
          muted
        />
      </div>
    </div>
  );
}
