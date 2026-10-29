import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function config() {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_REGION || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) throw new Error('S3 storage is not configured');
  return { endpoint: S3_ENDPOINT, region: S3_REGION, bucket: S3_BUCKET, credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY } };
}
function client() { const settings = config(); return new S3Client({ region: settings.region, endpoint: settings.endpoint || undefined, forcePathStyle: Boolean(settings.endpoint), credentials: settings.credentials }); }
export async function putPrivateObject(key: string, body: Uint8Array, mimeType: string) { const settings = config(); await client().send(new PutObjectCommand({ Bucket: settings.bucket, Key: key, Body: body, ContentType: mimeType })); }
export async function deletePrivateObject(key: string) { const settings = config(); await client().send(new DeleteObjectCommand({ Bucket: settings.bucket, Key: key })); }
export async function signedPrivateDownload(key: string, filename?: string) { const settings = config(); return getSignedUrl(client(), new GetObjectCommand({ Bucket: settings.bucket, Key: key, ResponseContentDisposition: filename ? `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"` : undefined }), { expiresIn: 300 }); }
