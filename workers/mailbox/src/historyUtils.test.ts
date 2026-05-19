import { describe, expect, it } from 'vitest';
import { parseSavedAt, previewSnapshotText } from './historyUtils';

describe('historyUtils', () => {
  it('previewSnapshotText truncates long lines', () => {
    const long = 'a'.repeat(100);
    expect(previewSnapshotText(long).endsWith('…')).toBe(true);
    expect(previewSnapshotText('hello\nworld')).toBe('hello');
    expect(previewSnapshotText('   ')).toBe('(empty)');
  });

  it('parseSavedAt accepts ms number and ISO string', () => {
    const ms = Date.parse('2026-05-19T12:00:00.000Z');
    expect(parseSavedAt(ms)).toBe('2026-05-19T12:00:00.000Z');
    expect(parseSavedAt('2026-05-19T12:00:00.000Z')).toBe('2026-05-19T12:00:00.000Z');
    expect(parseSavedAt('')).toBeNull();
    expect(parseSavedAt(null)).toBeNull();
  });
});
