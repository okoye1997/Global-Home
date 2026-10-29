import { describe, expect, it } from 'vitest';
import { buildPropertyQuery, mapsUrl } from './marketplace';
describe('map URL',()=>{it('uses validated coordinates',()=>expect(mapsUrl(6.5,3.4)).toContain('6.5%2C3.4'));it('falls back to an encoded address',()=>expect(mapsUrl(0,0,'Lagos Nigeria')).toContain('Lagos%20Nigeria'));it('omits empty locations',()=>expect(mapsUrl(0,0)).toBeNull())});
describe('marketplace query',()=>{
  it('converts local major price to the selected currency minor units',()=>{
    expect(buildPropertyQuery({country:'JP',minPrice:10000,maxPrice:20000},'JPY').localPriceMinor).toEqual({$gte:10000,$lte:20000});
  });
  it('requires a country for local price filtering',()=>expect(()=>buildPropertyQuery({minPrice:1000})).toThrow(/Select a country/));
  it('escapes city text and enforces published, verified inventory',()=>{
    const query=buildPropertyQuery({city:'A (North)',verifiedOnly:true});
    expect(query.status).toBe('published');
    expect(query.verificationStatus).toBe('verified');
    expect(query.isDemo).toBe(false);
    expect(query.verifiedAt).toEqual({$exists:true,$ne:null});
    expect(query.city).toEqual(/^A \(North\)$/i);
  });
  it('changes the country inventory filter independently of currency formatting',()=>{expect(buildPropertyQuery({country:'NG'}).countryCode).toBe('NG');expect(buildPropertyQuery({country:'GB'}).countryCode).toBe('GB');});
  it('filters customer-facing availability without relaxing publication checks',()=>{const query=buildPropertyQuery({availability:'reserved'});expect(query.availabilityStatus).toBe('reserved');expect(query.status).toBe('published');expect(buildPropertyQuery({availability:'internal'}).availabilityStatus).toBeUndefined();});
});
