import { computeNoiseAndMusicGains } from './gainMath';
import type { AtmosphereMode } from './storage';
import { trackUrl } from './musicPlaylist';

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
  /** Basename in `public/music-playlist/`. */
  private bedFile: string | null = null;
  private musicBufferByFile = new Map<string, AudioBuffer>();
  private loadRequestId = 0;

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
  }

  private stopMusicSource(): void {
    if (this.musicNode) {
      try {
        this.musicNode.stop(0);
      } catch {
        /* */
      }
      try {
        this.musicNode.disconnect();
      } catch {
        /* */
      }
      this.musicNode = null;
    }
  }

  /**
   * Set which file from `public/music-playlist/` to loop (basename).
   * Pass `null` to stop bed music. Idempotent for same file while playing.
   */
  setBedMusicFile(basename: string | null): void {
    if (this.bedFile === basename && this.musicNode) {
      this.musicBase01 = 1;
      this.apply(this.lastMode, this.lastMixer);
      return;
    }
    this.bedFile = basename;
    void this.loadBedMusic();
  }

  private startBufferLoop(buffer: AudioBuffer): void {
    if (!this.ctx || !this.musicGain) return;
    this.stopMusicSource();
    this.musicNode = this.ctx.createBufferSource();
    this.musicNode.buffer = buffer;
    this.musicNode.loop = true;
    this.musicNode.connect(this.musicGain);
    this.musicNode.start();
    this.musicBase01 = 1;
    this.apply(this.lastMode, this.lastMixer);
  }

  private async loadBedMusic(): Promise<void> {
    if (!this.ctx || !this.musicGain || !this.unlocked) return;
    const file = this.bedFile;
    this.stopMusicSource();
    this.musicBase01 = 0;
    this.apply(this.lastMode, this.lastMixer);
    if (!file) {
      return;
    }

    const myReq = ++this.loadRequestId;
    let buffer = this.musicBufferByFile.get(file);
    if (!buffer) {
      try {
        const res = await fetch(trackUrl(file));
        if (myReq !== this.loadRequestId || this.bedFile !== file) {
          return;
        }
        if (!res.ok) {
          this.apply(this.lastMode, this.lastMixer);
          return;
        }
        const arr = await res.arrayBuffer();
        if (myReq !== this.loadRequestId || this.bedFile !== file) {
          return;
        }
        if (!this.ctx) return;
        buffer = await this.ctx.decodeAudioData(arr.slice(0));
        this.musicBufferByFile.set(file, buffer);
      } catch {
        this.apply(this.lastMode, this.lastMixer);
        return;
      }
    }

    if (myReq !== this.loadRequestId) return;
    if (this.bedFile !== file) {
      return;
    }
    this.startBufferLoop(buffer);
  }

  private lastMode: AtmosphereMode = 'rain';
  private lastMixer: MixerSlice = { noise01: 0, musicBlend01: 0.5, intensity01: 0.3 };

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
    this.musicBufferByFile.clear();
  }
}

let singleton: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!singleton) singleton = new AudioEngine();
  return singleton;
}
