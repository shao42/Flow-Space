import { describe, it, expect } from 'vitest';
import { computeNoiseAndMusicGains } from './gainMath';

describe('computeNoiseAndMusicGains', () => {
  it('at blend 0, music is 0 and noise follows slider', () => {
    const { noise, music } = computeNoiseAndMusicGains(0, 0.7, 1);
    expect(music).toBe(0);
    expect(noise).toBeCloseTo(0.7);
  });
  it('at blend 1, noise is 0 and music follows base', () => {
    const { noise, music } = computeNoiseAndMusicGains(1, 0.5, 0.8);
    expect(noise).toBe(0);
    expect(music).toBeCloseTo(0.8);
  });
  it('at blend 0.5, both scaled by crossfade', () => {
    const { noise, music } = computeNoiseAndMusicGains(0.5, 1, 1);
    expect(noise).toBeCloseTo(0.5);
    expect(music).toBeCloseTo(0.5);
  });
});
