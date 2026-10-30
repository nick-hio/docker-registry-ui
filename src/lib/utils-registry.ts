export function bytesToSize(bytes?: number) {
  if (bytes === undefined || !Number.isFinite(bytes)) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 4);
  return `${(bytes / 1024 ** i).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${units[i]}`;
}
export function dateFormat(value?: string) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export const stripHttps = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
export const isDigit = (char: string) => char >= '0' && char <= '9';
export function getRegistryServers(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem('registryServer') || '[]');
    return Array.isArray(value)
      ? value.filter((v) => typeof v === 'string').map((v) => v.trim().replace(/\/+$/, ''))
      : [];
  } catch {
    return [];
  }
}
export function setRegistryServers(registries: string[]) {
  try {
    localStorage.setItem('registryServer', JSON.stringify(registries));
  } catch {
    /* Browsing remains available when storage is disabled. */
  }
}
export function isNewestVersion(current: string | null = '0.0.0', release: string | null = '0.0.0') {
  if (current === release) return true;
  const a = (current || '0.0.0').split('.'),
    b = (release || '0.0.0').split('.');
  const cmp = (i: number) => (parseInt(a[i]) || 0) - (parseInt(b[i]) || 0);
  return cmp(0) > 0 || (cmp(0) === 0 && (cmp(1) > 0 || (cmp(1) === 0 && !a[2]?.includes('-') && cmp(2) >= 0)));
}
