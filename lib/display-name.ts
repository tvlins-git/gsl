const HONORIFICS = new Set(['hr', 'fr', 'mr', 'mrs', 'ms', 'dr']);

export function isHonorific(token: string) {
  const normalized = token.trim().replace(/\.+$/, '').toLowerCase();
  return HONORIFICS.has(normalized);
}

export function nameParts(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .filter((part) => !isHonorific(part));
}

export function getInitials(name: string) {
  const parts = nameParts(name);
  const source = parts.length > 0 ? parts : name.split(/\s+/).filter(Boolean);
  const initials = source
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
  return initials || '?';
}
