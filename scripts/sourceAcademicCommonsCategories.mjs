import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const manifestPath = path.resolve('src/data/academic-images.json');
const outputRoot = path.resolve('public/images/academic/library');
const sources = {
  house: ['Houses', 'Residential buildings'], apartment: ['Apartment buildings'], villa: ['Villas'],
  townhouse: ['Townhouses', 'Terraced houses'], condominium: ['Condominiums'],
  land: ['Vacant lots', 'Fields'], 'commercial-land': ['Industrial areas', 'Vacant lots'],
  commercial: ['Commercial buildings'], office: ['Office buildings'], hotel: ['Hotels'],
  resort: ['Resorts'], 'event-centre': ['Convention centers', 'Conference centers'],
  warehouse: ['Warehouses'], retail: ['Shopping malls', 'Retail buildings'],
};
const target = 72;
const agent = 'GlobalHomeAcademicImages/1.0 (educational image curation)';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const strip = value => String(value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const acceptable = value => /^(CC0|CC BY(?:-SA)? \d(?:\.\d)?|Public domain|PD-)/i.test(value || '');
const excludedTitle = /\.tiff?$|\b(sheet|drawing|diagram|map|graph|chart|study|mural|poster|painting|engraving|sketch|manuscript|floor plan|blueprint)\b/i;
async function request(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': agent } });
      if (response.ok) return response;
      if (![429, 500, 502, 503, 504].includes(response.status)) throw new Error(`HTTP ${response.status}`);
    } catch (error) { if (i === 2) throw error; }
    await pause(1000 * 2 ** i);
  }
  throw new Error('Request failed');
}
let manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const seen = new Set(manifest.map(item => item.pageId));
for (const [category, commonsCategories] of Object.entries(sources)) {
  for (const commonsCategory of commonsCategories) {
    let continuation = '';
    for (let pageNumber = 0; pageNumber < 12 && manifest.filter(item => item.category === category).length < target; pageNumber++) {
      const params = new URLSearchParams({ action: 'query', format: 'json', generator: 'categorymembers', gcmtitle: `Category:${commonsCategory}`, gcmtype: 'file', gcmlimit: '100', prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '800' });
      if (continuation) params.set('gcmcontinue', continuation);
      let result;
      try { result = await (await request(`https://commons.wikimedia.org/w/api.php?${params}`)).json(); }
      catch (error) { console.error(`${category}/${commonsCategory}: ${error.message}`); break; }
      const candidates = Object.values(result.query?.pages || {}).filter(page => {
        const info = page.imageinfo?.[0];
        return info?.thumburl?.includes('/thumb/') && acceptable(strip(info.extmetadata?.LicenseShortName?.value)) && !seen.has(page.pageid)
          && info.width >= 800 && info.height >= 500 && info.width / info.height >= 1.1 && info.width / info.height <= 2.8
          && !excludedTitle.test(page.title);
      }).slice(0, target - manifest.filter(item => item.category === category).length);
      for (let i = 0; i < candidates.length; i += 1) {
        await Promise.allSettled(candidates.slice(i, i + 1).map(async page => {
          const info = page.imageinfo[0];
          const file = `${category}/${page.pageid}.webp`;
          try {
            const bytes = Buffer.from(await (await request(info.thumburl)).arrayBuffer());
            const optimized = await sharp(bytes).rotate().resize(800, 540, { fit: 'cover' }).webp({ quality: 78 }).toBuffer();
            await mkdir(path.dirname(path.join(outputRoot, file)), { recursive: true });
            await writeFile(path.join(outputRoot, file), optimized);
            manifest.push({ pageId: page.pageid, category, url: `/images/academic/library/${file}`, title: page.title.replace(/^File:/, ''), author: strip(info.extmetadata?.Artist?.value) || 'Unknown author', license: strip(info.extmetadata?.LicenseShortName?.value), licenseUrl: strip(info.extmetadata?.LicenseUrl?.value), sourceUrl: info.descriptionurl, sha1: info.sha1 || null });
            seen.add(page.pageid);
          } catch (error) { console.error(`${category}/${page.pageid}: ${error.message}`); }
        }));
        await pause(250);
      }
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      console.log(JSON.stringify({ category, commonsCategory, count: manifest.filter(item => item.category === category).length, total: manifest.length }));
      continuation = result.continue?.gcmcontinue || '';
      if (!continuation) break;
      await pause(1500);
    }
  }
}
console.log(JSON.stringify({ total: manifest.length, byCategory: Object.fromEntries(Object.keys(sources).map(category => [category, manifest.filter(item => item.category === category).length])) }));
if (manifest.length < 1000) process.exitCode = 1;
