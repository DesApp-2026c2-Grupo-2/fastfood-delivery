import { useEffect, useRef } from 'react';
import { divIcon, map as createMap, marker as createMarker, tileLayer, type Map, type Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pinIcon = divIcon({
  className: 'branch-pin',
  iconSize: [28, 28],
  iconAnchor: [14, 26],
  html: '<span class="branch-pin-dot"></span>',
});

const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];
const DEFAULT_ZOOM = 12;
const PIN_ZOOM = 16;

type BranchPinMapProps = {
  latitude: number | null;
  longitude: number | null;
  onMove: (latitude: number, longitude: number) => void;
};

export function BranchPinMap({ latitude, longitude, onMove }: BranchPinMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = createMap(container, { scrollWheelZoom: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    map.on('click', (event) => {
      onMoveRef.current(event.latlng.lat, event.latlng.lng);
    });
    mapRef.current = map;
    const frame = window.requestAnimationFrame(() => map.invalidateSize());

    return () => {
      window.cancelAnimationFrame(frame);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (latitude == null || longitude == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const latlng = { lat: latitude, lng: longitude };
    if (!markerRef.current) {
      const pin = createMarker(latlng, { draggable: true, icon: pinIcon, autoPan: true }).addTo(map);
      pin.on('dragend', () => {
        const position = pin.getLatLng();
        onMoveRef.current(position.lat, position.lng);
      });
      markerRef.current = pin;
      map.setView(latlng, PIN_ZOOM);
      return;
    }

    const current = markerRef.current.getLatLng();
    if (current.lat !== latitude || current.lng !== longitude) {
      markerRef.current.setLatLng(latlng);
      map.panTo(latlng);
    }
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className="branch-map"
      role="application"
      aria-label="Mapa para marcar la sucursal. Hacé clic o arrastrá el pin."
    />
  );
}
