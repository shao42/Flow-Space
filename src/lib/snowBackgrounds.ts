export type SnowBackgroundId = 'mountain_forest' | 'night_sky' | 'winter_house';

export const SNOW_BACKGROUND_OPTIONS: { id: SnowBackgroundId; label: string }[] = [
  { id: 'mountain_forest', label: 'mountain_forest' },
  { id: 'night_sky', label: 'night_sky' },
  { id: 'winter_house', label: 'winter_house' },
];

export const DEFAULT_SNOW_BACKGROUND: SnowBackgroundId = 'mountain_forest';

export function isSnowBackgroundId(v: unknown): v is SnowBackgroundId {
  return v === 'mountain_forest' || v === 'night_sky' || v === 'winter_house';
}

/** Public URL path segment (files live under `public/`). */
export function snowBackgroundAssetName(id: SnowBackgroundId): string {
  return `snow-bg-${id}.jpg`;
}
