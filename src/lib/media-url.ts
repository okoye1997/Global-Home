export function safeMediaUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.hostname.length < 4) return undefined;
    return url.toString();
  } catch { return undefined; }
}
