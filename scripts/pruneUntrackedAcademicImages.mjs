import { readFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

// Only removes newly sourced files under the academic library that were never recorded in the attribution manifest.
const root = path.resolve('public/images/academic/library');
const manifest = JSON.parse(await readFile('src/data/academic-images.json', 'utf8'));
const referenced = new Set(manifest.map(item => item.url.slice('/images/academic/library/'.length)));
const files = (await readdir(root, { recursive: true })).filter(file => file.endsWith('.webp')).map(file => file.replaceAll('\\', '/'));
const orphaned = files.filter(file => !referenced.has(file));
console.log(JSON.stringify({ tracked: referenced.size, files: files.length, orphaned: orphaned.length }));
if (process.argv.includes('--prune')) {
  for (const file of orphaned) {
    const target = path.resolve(root, file);
    if (!target.startsWith(root + path.sep)) throw new Error('Refusing to remove a file outside the academic image library');
    await unlink(target);
  }
  console.log(JSON.stringify({ removedUntrackedFiles: orphaned.length }));
}
