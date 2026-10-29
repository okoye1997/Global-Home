'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import type { MapPoint } from '@/lib/map-points';
import { msg } from '@/lib/messages';

export function PropertyMap({ points, browserKey, mapId, locale }: { points: MapPoint[]; browserKey?: string; mapId?: string; locale: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(points[0]?.id);

  useEffect(() => {
    if (!browserKey || !mapId || !container.current || !points.length) return;
    let disposed = false;
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    async function initialize() {
      try {
        setOptions({ key: browserKey!, v: 'weekly', language: locale });
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([importLibrary('maps'), importLibrary('marker')]);
        if (disposed || !container.current) return;
        const map = new Map(container.current, { center: { lat: points[0].latitude, lng: points[0].longitude }, zoom: 10, mapId, mapTypeControl: false });
        const bounds = new google.maps.LatLngBounds();
        for (const point of points) {
          const position = { lat: point.latitude, lng: point.longitude };
          bounds.extend(position);
          const marker = new AdvancedMarkerElement({ map, position, title: point.title, gmpClickable: true });
          marker.addListener('click', () => setSelected(point.id));
          markers.push(marker);
        }
        if (points.length > 1) map.fitBounds(bounds, 70);
      } catch { if (!disposed) setFailed(true); }
    }
    void initialize();
    return () => { disposed = true; for (const marker of markers) marker.map = null; };
  }, [browserKey, mapId, locale, points]);

  const usable = !!browserKey && !!mapId && !failed && points.length > 0;
  return <div className="property-map-layout">
    {usable && <div ref={container} className="property-map-canvas" role="application" aria-label={msg(locale,'property','location')}/>}
    <div className="property-map-list">
      {!usable && <p className="notice">{msg(locale,'marketplace','mapFallback')}</p>}
      {points.length ? points.map(point => <div className={`panel ${selected === point.id ? 'map-selected' : ''}`} key={point.id}>
        <strong>{point.title}</strong>
        {usable && <button type="button" className="button button-secondary" onClick={() => setSelected(point.id)}>{msg(locale,'marketplace','selectMarker')}</button>}
        <Link href={point.href}>{msg(locale,'marketplace','viewProperty')}</Link>
        <a href={point.mapUrl} target="_blank" rel="noopener noreferrer">{msg(locale,'property','maps')}</a>
      </div>) : <p className="empty">{msg(locale,'marketplace','noMapPoints')}</p>}
    </div>
  </div>;
}
