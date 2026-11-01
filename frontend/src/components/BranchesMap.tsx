import { useEffect, useRef } from 'react';
import {
  circle,
  divIcon,
  latLngBounds,
  layerGroup,
  map as createMap,
  marker as createMarker,
  tileLayer,
  type LatLngExpression,
  type LayerGroup,
  type Map,
  type Marker,
} from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ActiveBranch } from '../api/types';
import { formatBranchAddress } from '../lib/address';

const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];
const DEFAULT_ZOOM = 11;
const FIT_MAX_ZOOM = 15;
const FOCUS_ZOOM = 16;

export type MapOrigin = { latitude: number; longitude: number };

type BranchesMapProps = {
  branches: ActiveBranch[];
  /** Dirección o ubicación elegida. Sin origen, el mapa muestra todas las sucursales por igual. */
  origin: MapOrigin | null;
  radiusKm: number | null;
  focusedId: string;
  /** Sube en cada "Ver en el mapa", así repetir la misma sucursal vuelve a centrarla y abrir su ficha. */
  focusRequest: number;
  onSelect: (branchId: string) => void;
};

function coverage(branch: ActiveBranch): 'near' | 'far' | 'neutral' {
  if (branch.withinRadius === true) return 'near';
  if (branch.withinRadius === false) return 'far';
  return 'neutral';
}

function branchIcon(branch: ActiveBranch, focused: boolean) {
  return divIcon({
    className: `branch-pin branch-pin--${coverage(branch)}${focused ? ' is-focused' : ''}`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -26],
    html: '<span class="branch-pin-dot"></span>',
  });
}

const originIcon = divIcon({
  className: 'origin-pin',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: '<span class="origin-pin-dot"></span>',
});

function latLng(branch: ActiveBranch): [number, number] {
  return [Number(branch.latitude), Number(branch.longitude)];
}

// Se arma con nodos y textContent: nombre y dirección los carga el admin y no se interpretan como HTML.
function popupContent(branch: ActiveBranch): HTMLElement {
  const root = document.createElement('div');
  root.className = 'branch-popup';
  const add = (tag: string, text: string, className?: string) => {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    root.appendChild(node);
    return node;
  };
  add('strong', branch.name);
  add('span', formatBranchAddress(branch));
  add('span', branch.openingHours, 'branch-popup-meta');
  const phone = add('a', branch.phone) as HTMLAnchorElement;
  phone.href = `tel:${branch.phone.replace(/\s/g, '')}`;
  if (branch.withinRadius === true) add('span', 'Te cubre', 'branch-popup-badge');
  if (branch.withinRadius === false) add('span', 'Fuera de tu zona', 'branch-popup-badge is-off');
  return root;
}

/**
 * Mapa de sucursales (HU-35). Cambia con la dirección elegida: marca tu punto, dibuja el radio de envío,
 * pinta cada sucursal según si te cubre y encuadra tu punto con las que te llegan.
 */
export function BranchesMap({ branches, origin, radiusKm, focusedId, focusRequest, onSelect }: BranchesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const branchLayerRef = useRef<LayerGroup | null>(null);
  const originLayerRef = useRef<LayerGroup | null>(null);
  const markersRef = useRef(new globalThis.Map<string, { marker: Marker; branch: ActiveBranch }>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const focusedRef = useRef(focusedId);
  focusedRef.current = focusedId;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = createMap(container, { scrollWheelZoom: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    originLayerRef.current = layerGroup().addTo(map);
    branchLayerRef.current = layerGroup().addTo(map);
    mapRef.current = map;
    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    const markers = markersRef.current;

    return () => {
      window.cancelAnimationFrame(frame);
      map.remove();
      mapRef.current = null;
      branchLayerRef.current = null;
      originLayerRef.current = null;
      markers.clear();
    };
  }, []);

  // Marcadores de sucursales: se rehacen cuando cambia la lista o su cobertura.
  useEffect(() => {
    const layer = branchLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    for (const branch of branches) {
      const pin = createMarker(latLng(branch), {
        icon: branchIcon(branch, branch.id === focusedRef.current),
        title: branch.name,
        keyboard: true,
      })
        .bindPopup(popupContent(branch))
        .on('click', () => onSelectRef.current(branch.id));
      pin.addTo(layer);
      markersRef.current.set(branch.id, { marker: pin, branch });
    }
  }, [branches]);

  // Tu punto, el radio y el encuadre.
  useEffect(() => {
    const map = mapRef.current;
    const layer = originLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const points: LatLngExpression[] = [];
    if (origin) {
      const center: [number, number] = [origin.latitude, origin.longitude];
      if (radiusKm && radiusKm > 0) {
        circle(center, {
          radius: radiusKm * 1000,
          className: 'branch-coverage',
          interactive: false,
        }).addTo(layer);
      }
      createMarker(center, { icon: originIcon, keyboard: false, zIndexOffset: 1000 })
        .bindTooltip('Vos estás acá', { direction: 'top', offset: [0, -10] })
        .addTo(layer);
      points.push(center);
    }

    const covering = branches.filter((branch) => branch.withinRadius === true);
    const framed = origin && covering.length > 0 ? covering : branches;
    points.push(...framed.map(latLng));

    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], FIT_MAX_ZOOM - 1);
      return;
    }
    map.fitBounds(latLngBounds(points), { padding: [36, 36], maxZoom: FIT_MAX_ZOOM });
  }, [origin, radiusKm, branches]);

  // La sucursal elegida en la lista: se resalta, se centra y abre su ficha.
  useEffect(() => {
    const map = mapRef.current;
    for (const [id, { marker, branch }] of markersRef.current) {
      marker.setIcon(branchIcon(branch, id === focusedId));
    }
    const target = focusedId ? markersRef.current.get(focusedId) : undefined;
    if (!map || !target) return;
    // El popup se abre al terminar el vuelo: abierto durante la animación queda cortado arriba.
    const open = () => target.marker.openPopup();
    map.once('moveend', open);
    map.flyTo(target.marker.getLatLng(), Math.max(map.getZoom(), FOCUS_ZOOM), { duration: 0.6 });
    return () => {
      map.off('moveend', open);
    };
  }, [focusedId, focusRequest]);

  return (
    <div
      ref={containerRef}
      className="branches-map"
      role="region"
      aria-label="Mapa de sucursales. Tocá un marcador para ver nombre, dirección y horario."
    />
  );
}
