export function formatRelativeTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const HONORIFICS = new Set(['hr.', 'mr.', 'mrs.', 'ms.', 'dr.']);

export function firstName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && HONORIFICS.has(parts[0].toLowerCase())) {
    return parts[1];
  }
  return parts[0] ?? name;
}
