import { computeNoiseAndMusicGains } from './gainMath';
import type { AtmosphereMode } from './storage';

/** File in `public/audio/` — URL-encoded when fetching (spaces, Unicode). */
const BED_MUSIC_FILE = 'Merry Christmas Mr. Lawrence-坂本龍一.mp3';

type MixerSlice = {
  noise01: number;
  musicBlend01: number;
  intensity01: number;
};

function fillNoiseBuffer(buffer: AudioBuffer): void {
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private noiseNode: AudioBufferSourceNode | null = null;
  private rainNode: AudioBufferSourceNode | null = null;
  private musicNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private master: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private musicBase01 = 0;

  unlock(): void {
    if (this.unlocked) {
      void this.ctx?.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);

    const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    fillNoiseBuffer(noiseBuf);
    this.noiseGain = this.ctx.createGain();
    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuf;
    this.noiseNode.loop = true;
    this.noiseNode.connect(this.noiseGain);
    this.noiseGain.connect(this.master);

    const rainBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    fillNoiseBuffer(rainBuf);
    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = 'lowpass';
    this.rainFilter.frequency.value = 800;
    this.rainGain = this.ctx.createGain();
    this.rainNode = this.ctx.createBufferSource();
    this.rainNode.buffer = rainBuf;
    this.rainNode.loop = true;
    this.rainNode.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.master);

    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.master);

    this.noiseNode.start();
    this.rainNode.start();

    void this.ctx.resume();
    this.unlocked = true;

    void this.tryLoadMusic();
  }

  private async tryLoadMusic(): Promise<void> {
    if (!this.ctx || !this.musicGain) return;
    try {
      const url = `${import.meta.env.BASE_URL}audio/${encodeURIComponent(BED_MUSIC_FILE)}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const arr = await res.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(arr.slice(0));
      this.musicNode = this.ctx.createBufferSource();
      this.musicNode.buffer = buf;
      this.musicNode.loop = true;
      this.musicNode.connect(this.musicGain);
      this.musicNode.start();
      this.musicBase01 = 1;
      this.apply(this.lastMode, this.lastMixer);
    } catch {
      this.musicBase01 = 0;
    }
  }

  private lastMode: AtmosphereMode = 'rain';
  private lastMixer: MixerSlice = { noise01: 0.5, musicBlend01: 0.5, intensity01: 1 };

  apply(mode: AtmosphereMode, mixer: MixerSlice): void {
    this.lastMode = mode;
    this.lastMixer = mixer;
    if (!this.unlocked || !this.noiseGain || !this.rainGain || !this.musicGain) return;

    const { noise, music } = computeNoiseAndMusicGains(
      mixer.musicBlend01,
      mixer.noise01,
      this.musicBase01
    );
    this.noiseGain.gain.value = noise * 0.35;
    this.musicGain.gain.value = music * 0.4;
    const rain = mode === 'rain' ? mixer.intensity01 * 0.32 : 0;
    this.rainGain.gain.value = rain;
  }

  playZenCompleteChime(): void {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 528;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(this.master);
    const t = this.ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.start(t);
    o.stop(t + 0.4);
  }

  destroy(): void {
    try {
      this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.unlocked = false;
  }
}

let singleton: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!singleton) singleton = new AudioEngine();
  return singleton;
}
