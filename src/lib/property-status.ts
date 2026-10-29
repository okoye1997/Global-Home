export function publicAvailabilityLabel(purpose: string, availability: string): string {
  const labels: Record<string, string> = { reserved: 'Reserved', unavailable: 'Unavailable', sold: 'Sold', rented: 'Rented', leased: 'Leased' };
  if (labels[availability]) return labels[availability];
  return ({ buy: 'For Sale', rent: 'For Rent', lease: 'For Lease', invest: 'For Investment' } as Record<string, string>)[purpose] || 'Available';
}
