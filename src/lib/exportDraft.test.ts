import { describe, it, expect } from 'vitest';
import { buildExportFilename } from './exportDraft';

describe('buildExportFilename', () => {
  it('uses local 24h time in filename', () => {
    const d = new Date(2026, 2, 23, 9, 5, 0);
    expect(buildExportFilename(d)).toBe('flow-space-2026-03-23-0905.txt');
  });
});
