import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Curated, openly licensed Commons category members. This script only writes local images and attribution metadata.
const countries = {
  NG: 'Nigeria', GH: 'Ghana', ZA: 'South Africa', ZW: 'Zimbabwe', US: 'the United States',
  CA: 'Canada', BR: 'Brazil', GB: 'the United Kingdom', FR: 'France', DE: 'Germany',
  AE: 'the United Arab Emirates', IN: 'India', CN: 'China', JP: 'Japan', AU: 'Australia',
  KE: 'Kenya', EG: 'Egypt', MX: 'Mexico', ES: 'Spain', IT: 'Italy', NL: 'the Netherlands',
  PT: 'Portugal', TR: 'Turkey', ID: 'Indonesia', PH: 'the Philippines', KR: 'South Korea',
  NZ: 'New Zealand', SE: 'Sweden', CH: 'Switzerland', AR: 'Argentina',
};
const manifestPath = path.resolve('src/data/academic-images.json');
const outputRoot = path.resolve('public/images/academic/library');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const seen = new Set(manifest.map(item => item.pageId));
const targetPerCountry = 18;
const agent = 'GlobalHomeAcademicImages/1.0 (educational image curation)';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const strip = value => String(value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const acceptable = value => /^(CC0|CC BY(?:-SA)? \d(?:\.\d)?|Public domain|PD-)/i.test(value || '');
const excluded = /\.tiff?$|\b(sheet|drawing|diagram|map|graph|chart|study|mural|poster|painting|engraving|sketch|manuscript|floor plan|blueprint|advertisement|advert|bad|ruin|derelict|dilapidated|decay|abandoned|destroyed|demolished|fire|flood|slum|shanty|squatter|broken|collapsed)\b/i;
async function request(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': agent } });
      if (response.ok) return response;
      if (![429, 500, 502, 503, 504].includes(response.status)) throw new Error(`HTTP ${response.status}`);
    } catch (error) { if (attempt === 3) throw error; }
    await pause(1500 * 2 ** attempt);
  }
  throw new Error('Request failed');
}
for (const [code, name] of Object.entries(countries)) {
  let continuation = '';
  for (let pageNumber = 0; pageNumber < 4 && manifest.filter(item => item.countryCode === code).length < targetPerCountry; pageNumber++) {
    const params = new URLSearchParams({ action: 'query', format: 'json', generator: 'categorymembers', gcmtitle: `Category:Houses in ${name}`, gcmtype: 'file', gcmlimit: '100', prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '800' });
    if (continuation) params.set('gcmcontinue', continuation);
    let result;
    try { result = await (await request(`https://commons.wikimedia.org/w/api.php?${params}`)).json(); }
    catch (error) { console.error(`${code} metadata: ${error.message}`); break; }
    const candidates = Object.values(result.query?.pages || {}).filter(page => {
      const info = page.imageinfo?.[0];
      return info?.thumburl?.includes('/thumb/') && acceptable(strip(info.extmetadata?.LicenseShortName?.value))
        && !seen.has(page.pageid) && info.width >= 800 && info.height >= 500
        && info.width / info.height >= 1.1 && info.width / info.height <= 2.8 && !excluded.test(page.title);
    }).slice(0, targetPerCountry - manifest.filter(item => item.countryCode === code).length);
    for (const page of candidates) {
      const info = page.imageinfo[0];
      const file = `country/${code.toLowerCase()}/${page.pageid}.webp`;
      try {
        const bytes = Buffer.from(await (await request(info.thumburl)).arrayBuffer());
        const optimized = await sharp(bytes).rotate().resize(800, 540, { fit: 'cover' }).webp({ quality: 78 }).toBuffer();
        await mkdir(path.dirname(path.join(outputRoot, file)), { recursive: true });
        await writeFile(path.join(outputRoot, file), optimized);
        manifest.push({ pageId: page.pageid, category: 'house', countryCode: code, url: `/images/academic/library/${file}`, title: page.title.replace(/^File:/, ''), author: strip(info.extmetadata?.Artist?.value) || 'Unknown author', license: strip(info.extmetadata?.LicenseShortName?.value), licenseUrl: strip(info.extmetadata?.LicenseUrl?.value), sourceUrl: info.descriptionurl, sha1: info.sha1 || null });
        seen.add(page.pageid);
      } catch (error) { console.error(`${code}/${page.pageid}: ${error.message}`); }
      await pause(300);
    }
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(JSON.stringify({ countryCode: code, countryImages: manifest.filter(item => item.countryCode === code).length, total: manifest.length }));
    continuation = result.continue?.gcmcontinue || '';
    if (!continuation) break;
    await pause(1500);
  }
}
console.log(JSON.stringify({ total: manifest.length, countrySpecific: manifest.filter(item => item.countryCode).length }));
if (manifest.length < 1000) process.exitCode = 1;
