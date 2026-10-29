export const identityFileLimit = 8 * 1024 * 1024;
export const identityKinds = ['passport', 'national_id', 'drivers_licence'] as const;

export function validIdentityExtension(filename: string, mimeType: string): boolean {
  const extension = filename.trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  const allowed: Record<string, string[]> = { 'application/pdf': ['pdf'], 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'] };
  return !!extension && (allowed[mimeType] || []).includes(extension);
}

export function detectedIdentityMime(bytes: Uint8Array): 'application/pdf' | 'image/jpeg' | 'image/png' | null {
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-') return 'application/pdf';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return 'image/png';
  return null;
}
