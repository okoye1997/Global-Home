import { detectedIdentityMime, validIdentityExtension } from './identity-files';

export const privateDocumentKinds = ['property', 'deal', 'investment', 'statement', 'agreement'] as const;
export const privateDocumentLimit = 10 * 1024 * 1024;

export function validatePrivateDocument(filename: string, declaredMime: string, bytes: Uint8Array) {
  const detected = detectedIdentityMime(bytes);
  if (!detected || detected !== declaredMime || !validIdentityExtension(filename, detected) || bytes.length < 100 || bytes.length > privateDocumentLimit) throw new Error('Unsupported document file');
  return detected;
}
