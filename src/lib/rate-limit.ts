import { createHash } from 'node:crypto';
import { connectDb } from './db';
import { RequestLimit } from './models';
export async function consumeRateLimit(scope: string, identifier: string, maximum: number, windowMs: number): Promise<boolean> {
  await connectDb();
  const key = createHash('sha256').update(`${scope}:${identifier.toLowerCase()}`).digest('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);
  const expired = { $lte: [{ $ifNull: ['$expiresAt', new Date(0)] }, now] };
  const row = await RequestLimit.findOneAndUpdate({ key }, [{ $set: { key, count: { $cond: [expired, 1, { $add: [{ $ifNull: ['$count', 0] }, 1] }] }, expiresAt: { $cond: [expired, expiresAt, '$expiresAt'] } } }], { upsert: true, returnDocument: 'after', updatePipeline: true });
  return row.count <= maximum;
}
