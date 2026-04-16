export function computeNoiseAndMusicGains(
  blend01: number,
  noiseSlider01: number,
  musicBase01: number
): { noise: number; music: number } {
  const b = Math.min(1, Math.max(0, blend01));
  const n = Math.min(1, Math.max(0, noiseSlider01));
  const m = Math.min(1, Math.max(0, musicBase01));
  return { noise: (1 - b) * n, music: b * m };
}
