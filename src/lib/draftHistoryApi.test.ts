import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { uploadLocalSnapshots } from './draftHistoryApi';

describe('uploadLocalSnapshots', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        return new Response(
          JSON.stringify({
            snapshot: {
              id: 'snap-1',
              savedAt: new Date(body.savedAt).toISOString(),
              preview: 'x',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uploads non-empty local entries', async () => {
    const result = await uploadLocalSnapshots([
      { id: '1', savedAt: 1000, text: 'hello' },
      { id: '2', savedAt: 2000, text: '   ' },
    ]);
    expect(result.uploaded).toBe(1);
    expect(result.skipped).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
