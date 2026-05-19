export function previewSnapshotText(text: string): string {
  const line = text.split(/\r?\n/).find((l) => l.trim()) ?? text;
  if (!line.trim()) return '(empty)';
  return line.length > 80 ? `${line.slice(0, 80)}…` : line;
}

export function parseSavedAt(input: unknown): string | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return new Date(input).toISOString();
  }
  if (typeof input === 'string' && input.trim()) {
    const d = new Date(input);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}
