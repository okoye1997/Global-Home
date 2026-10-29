export type MapPoint = { id: string; title: string; href: string; mapUrl: string; latitude: number; longitude: number };

export function validCoordinates(coordinates: number[] | undefined | null): { latitude: number; longitude: number } | null {
  if (!coordinates || coordinates.length !== 2) return null;
  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || (latitude === 0 && longitude === 0)) return null;
  return { latitude, longitude };
}
