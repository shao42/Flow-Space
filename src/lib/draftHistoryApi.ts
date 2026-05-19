import type { DraftHistoryEntry } from './storage';
import { mailboxRequest } from './mailboxApi';
import { MailboxApiError, type CloudHistoryListItem, type CloudHistorySnapshot } from './mailboxTypes';

export async function fetchCloudHistory(): Promise<CloudHistoryListItem[]> {
  const data = await mailboxRequest<{ snapshots: CloudHistoryListItem[] }>('/api/history');
  return data.snapshots;
}

export async function fetchCloudHistoryEntry(id: string): Promise<CloudHistorySnapshot> {
  const data = await mailboxRequest<{ snapshot: CloudHistorySnapshot }>(`/api/history/${id}`);
  return data.snapshot;
}

export async function uploadSnapshot(
  text: string,
  savedAt: number
): Promise<CloudHistoryListItem> {
  const data = await mailboxRequest<{ snapshot: CloudHistoryListItem }>('/api/history', {
    method: 'POST',
    json: { text, savedAt },
  });
  return data.snapshot;
}

export async function uploadLocalSnapshots(
  entries: DraftHistoryEntry[]
): Promise<{ uploaded: number; skipped: number }> {
  let uploaded = 0;
  let skipped = 0;
  for (const entry of entries) {
    if (entry.text.trim().length === 0) {
      skipped += 1;
      continue;
    }
    try {
      await uploadSnapshot(entry.text, entry.savedAt);
      uploaded += 1;
    } catch (e) {
      if (e instanceof MailboxApiError && e.code === 'LIMIT_REACHED') {
        throw e;
      }
      skipped += 1;
    }
  }
  return { uploaded, skipped };
}
