import { useEffect, useRef, useState } from 'react';
import type { AddressParts } from '../lib/address';
import {
  addressLines,
  candidateParts,
  type GeocodeCandidate,
  pinParts,
  reverseGeocode,
  searchAddress,
} from '../lib/geocode';
import { formatCoordinate, requestDevicePosition } from '../lib/geolocation';
import { LocationPinMap } from './LocationPinMap';

type AddressLocationPickerProps = {
  address: AddressParts;
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
  /** Campos de texto que se pudieron sacar del mapa: el formulario los copia. */
  onAddressFound?: (patch: Partial<AddressParts>) => void;
  /** En el alta: intenta ubicar el pin con la posición del dispositivo al montarse. */
  locateOnMount?: boolean;
  disabled?: boolean;
};

function coordinateOrNull(value: string, min: number, max: number): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

function samePin(candidate: GeocodeCandidate, latitude: string, longitude: string) {
  return formatCoordinate(candidate.latitude) === latitude && formatCoordinate(candidate.longitude) === longitude;
}

/**
 * Lo que escribió el cliente no se pisa: solo se completan los campos vacíos o los que llenó el mapa
 * antes (si elige otro candidato, la ciudad y el CP pasan a ser los del nuevo).
 */
function fillable(
  address: AddressParts,
  autoFilled: Partial<AddressParts>,
  patch: Partial<AddressParts>,
): Partial<AddressParts> {
  const result: Partial<AddressParts> = {};
  for (const key of Object.keys(patch) as (keyof AddressParts)[]) {
    const current = address[key].trim();
    if (patch[key] && (!current || current === autoFilled[key])) result[key] = patch[key];
  }
  return result;
}

/**
 * La dirección como la escribió el cliente: ciudad, provincia y CP que completó el mapa (o la ubicación al
 * abrir el alta) y no se tocaron quedan vacíos, porque pueden ser de otro lugar que la calle buscada.
 */
function typedAddress(address: AddressParts, autoFilled: Partial<AddressParts>): AddressParts {
  const result = { ...address };
  for (const key of ['city', 'province', 'postalCode'] as const) {
    if (address[key].trim() === autoFilled[key]) result[key] = '';
  }
  return result;
}

function onlyStreet(address: AddressParts) {
  return !address.city.trim() && !address.province && !address.postalCode.trim();
}

/**
 * Ubicación de una dirección (DEV-23): buscar la calle trae hasta 5 candidatos, el pin se mueve con un clic
 * o arrastrándolo, y lo que queda en el pin es lo que se guarda. Sirve igual para el invitado en el checkout.
 * Con solo la calle escrita, la búsqueda sugiere y no completa nada hasta que se elige una opción.
 * Marcar el pin o "Usar mi ubicación" completan calle, ciudad, provincia y CP con lo que hay en ese punto.
 */
export function AddressLocationPicker({
  address,
  latitude,
  longitude,
  onChange,
  onAddressFound,
  locateOnMount = false,
  disabled = false,
}: AddressLocationPickerProps) {
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  // Sugerencias sin elegir: la lista se muestra aunque haya una sola y el pin todavía no se movió.
  const [mustChoose, setMustChoose] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hint, setHint] = useState('');
  const [warning, setWarning] = useState('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onAddressFoundRef = useRef(onAddressFound);
  onAddressFoundRef.current = onAddressFound;
  const addressRef = useRef(address);
  addressRef.current = address;
  const autoFilledRef = useRef<Partial<AddressParts>>({});
  // Si el pin se mueve de nuevo antes de que vuelva la dirección, solo cuenta el último punto.
  const pinRequestRef = useRef(0);

  function fill(patch: Partial<AddressParts>) {
    if (Object.keys(patch).length === 0) return;
    autoFilledRef.current = { ...autoFilledRef.current, ...patch };
    onAddressFoundRef.current?.(patch);
  }

  function clearCandidates() {
    setCandidates([]);
    setMustChoose(false);
  }

  useEffect(() => {
    clearCandidates();
  }, [address.street]);

  function applyCandidate(candidate: GeocodeCandidate, message: string) {
    pinRequestRef.current += 1;
    onChange(formatCoordinate(candidate.latitude), formatCoordinate(candidate.longitude));
    // La calle es la que se buscó; del candidato se toman ciudad, provincia y CP.
    const details = candidateParts(candidate);
    delete details.street;
    fill(fillable(addressRef.current, autoFilledRef.current, details));
    setMustChoose(false);
    setWarning('');
    setHint(message);
  }

  /** Lee la dirección del punto y la copia al formulario. `stale`: el pin ya se movió a otro lado. */
  async function fillFromPin(lat: number, lng: number): Promise<'ok' | 'failed' | 'stale'> {
    const request = ++pinRequestRef.current;
    try {
      const found = await reverseGeocode(lat, lng);
      if (request !== pinRequestRef.current) return 'stale';
      fill(pinParts(addressRef.current, found));
      return 'ok';
    } catch {
      return request === pinRequestRef.current ? 'failed' : 'stale';
    }
  }

  async function placePin(lat: number, lng: number) {
    onChange(formatCoordinate(lat), formatCoordinate(lng));
    clearCandidates();
    setWarning('');
    setHint('Punto marcado. Buscando la dirección de ese punto…');
    const result = await fillFromPin(lat, lng);
    if (result === 'stale') return;
    setHint(
      result === 'ok'
        ? 'Completamos la dirección con el punto del mapa. Revisá la calle y el número.'
        : 'Punto marcado. No pudimos leer la dirección de ese punto: completala a mano.',
    );
  }

  async function search() {
    if (!address.street.trim()) return;
    const query = typedAddress(address, autoFilledRef.current);
    const suggestOnly = onlyStreet(query);
    setSearching(true);
    setHint('');
    setWarning('');
    try {
      const list = await searchAddress(query);
      setCandidates(list);
      if (suggestOnly) {
        setMustChoose(true);
        setHint(
          `${
            list.length > 1
              ? `Hay ${list.length} direcciones posibles. Elegí la tuya y completamos ciudad, provincia y CP.`
              : 'Encontramos esta dirección. Si es la tuya, elegila y completamos ciudad, provincia y CP.'
          } Si no está, escribí la ciudad o la provincia y buscá de nuevo.`,
        );
        return;
      }
      applyCandidate(
        list[0],
        list.length > 1
          ? `Hay ${list.length} coincidencias. Tocá la que corresponde a tu dirección.`
          : 'Encontramos la dirección. Si el pin no cae justo, movelo en el mapa.',
      );
    } catch (err) {
      clearCandidates();
      const message = err instanceof Error ? err.message : 'No se pudo buscar la dirección.';
      setWarning(`${message} Igual podés marcar el punto tocando el mapa.`);
    } finally {
      setSearching(false);
    }
  }

  async function locate() {
    setLocating(true);
    setHint('');
    setWarning('');
    clearCandidates();
    try {
      const position = await requestDevicePosition();
      onChangeRef.current(formatCoordinate(position.latitude), formatCoordinate(position.longitude));
      const result = await fillFromPin(position.latitude, position.longitude);
      if (result === 'stale') return;
      setHint(
        result === 'ok'
          ? 'Completamos la dirección con tu ubicación. Revisala y, si el pin no es exacto, movelo en el mapa.'
          : 'Ubicación cargada. No pudimos leer la dirección de ese punto: completala a mano.',
      );
    } catch (err) {
      setWarning(err instanceof Error ? err.message : 'No pudimos obtener tu ubicación.');
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    if (locateOnMount) void locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = disabled || searching || locating;

  return (
    <fieldset className="address-location">
      <legend>Ubicación</legend>
      <p className="field-hint">
        Buscá la dirección o marcá el punto en el mapa: completamos calle, ciudad, provincia y CP. Lo que queda en
        el pin es lo que se guarda.
      </p>
      <div className="row">
        <button
          type="button"
          className="secondary"
          onClick={() => void search()}
          disabled={busy || !address.street.trim()}
        >
          {searching ? 'Buscando…' : 'Buscar en el mapa'}
        </button>
        <button type="button" className="secondary" onClick={() => void locate()} disabled={busy}>
          {locating ? 'Obteniendo…' : 'Usar mi ubicación'}
        </button>
      </div>
      {hint ? (
        <p className="muted address-location-hint" role="status">
          {hint}
        </p>
      ) : null}
      {warning ? (
        <p className="warning" role="alert">
          {warning}
        </p>
      ) : null}
      {candidates.length > 1 || (mustChoose && candidates.length > 0) ? (
        <fieldset className="geocode-options">
          <legend>Elegí la dirección</legend>
          {candidates.map((candidate, index) => {
            const selected = !mustChoose && samePin(candidate, latitude, longitude);
            const lines = addressLines(candidate);
            return (
              <button
                key={`${candidate.latitude}-${candidate.longitude}-${index}`}
                type="button"
                className={selected ? 'geocode-option is-on' : 'geocode-option'}
                aria-pressed={selected}
                onClick={() => applyCandidate(candidate, 'Elegida. Si el pin no cae justo, movelo en el mapa.')}
              >
                <span className="geocode-option-mark" aria-hidden="true">
                  {selected ? '✓' : index + 1}
                </span>
                <span>
                  <strong>{lines.title}</strong>
                  {lines.detail ? <span className="muted">{lines.detail}</span> : null}
                </span>
              </button>
            );
          })}
        </fieldset>
      ) : null}
      <LocationPinMap
        latitude={coordinateOrNull(latitude, -90, 90)}
        longitude={coordinateOrNull(longitude, -180, 180)}
        onMove={(lat, lng) => void placePin(lat, lng)}
      />
      <div className="row">
        <label>
          Latitud
          <input
            value={latitude}
            onChange={(event) => onChange(event.target.value, longitude)}
            inputMode="decimal"
            placeholder="-34.6037"
            disabled={disabled}
          />
        </label>
        <label>
          Longitud
          <input
            value={longitude}
            onChange={(event) => onChange(latitude, event.target.value)}
            inputMode="decimal"
            placeholder="-58.3816"
            disabled={disabled}
          />
        </label>
      </div>
    </fieldset>
  );
}
