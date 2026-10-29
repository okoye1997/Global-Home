// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PropertyMap } from './PropertyMap';

describe('map fallback', () => {
  it('retains property and Google Maps links without a browser key', () => {
    render(<PropertyMap locale="en" points={[{ id: 'one', title: 'Recorded property', href: '/en/properties/one', mapUrl: 'https://www.google.com/maps/search/?api=1&query=6%2C3', latitude: 6, longitude: 3 }]}/>);
    expect(screen.getByText(/Map rendering is unavailable/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View property' }).getAttribute('href')).toBe('/en/properties/one');
    expect(screen.getByRole('link', { name: 'View on Google Maps' }).getAttribute('href')).toContain('google.com/maps');
  });
});
