import { describe, expect, it } from 'vitest';
import { validCoordinates } from './map-points';

describe('map coordinates', () => {
  it('uses GeoJSON longitude/latitude order', () => expect(validCoordinates([3.4, 6.5])).toEqual({ latitude: 6.5, longitude: 3.4 }));
  it('rejects missing, sentinel, nonfinite and out-of-range coordinates', () => {
    for (const value of [undefined, [], [0, 0], [181, 10], [10, 91], [NaN, 5]]) expect(validCoordinates(value)).toBeNull();
  });
});
