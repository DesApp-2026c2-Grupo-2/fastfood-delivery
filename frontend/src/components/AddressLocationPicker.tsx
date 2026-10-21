import { useEffect, useRef, useState } from 'react';
import { addressLines, type GeocodeCandidate, searchAddress } from '../lib/geocode';
import { formatCoordinate, requestDevicePosition } from '../lib/geolocation';
import { LocationPinMap } from './LocationPinMap';

type AddressLocationPickerProps = {
  street: string;
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
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
 * Ubicación de una dirección (DEV-23): buscar la calle trae hasta 5 candidatos, el pin se mueve con un clic
 * o arrastrándolo, y lo que queda en el pin es lo que se guarda. Sirve igual para el invitado en el checkout.
 */
export function AddressLocationPicker({
  street,
  latitude,
  longitude,
  onChange,
  locateOnMount = false,
  disabled = false,
}: AddressLocationPickerProps) {
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hint, setHint] = useState('');
  const [warning, setWarning] = useState('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setCandidates([]);
  }, [street]);

  function applyCandidate(candidate: GeocodeCandidate, message: string) {
    onChange(formatCoordinate(candidate.latitude), formatCoordinate(candidate.longitude));
    setWarning('');
    setHint(message);
  }

  function placePin(lat: number, lng: number) {
    onChange(formatCoordinate(lat), formatCoordinate(lng));
    setWarning('');
    setHint('Punto marcado en el mapa. Esas coordenadas se guardan con la dirección.');
  }

  async function search() {
    const query = street.trim();
    if (!query) return;
    setSearching(true);
    setHint('');
    setWarning('');
    try {
      const list = await searchAddress(query);
      setCandidates(list);
      applyCandidate(
        list[0],
        list.length > 1
          ? `Hay ${list.length} coincidencias. Tocá la que corresponde a tu dirección.`
          : 'Encontramos la dirección. Si el pin no cae justo, movelo en el mapa.',
      );
    } catch (err) {
      setCandidates([]);
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
    setCandidates([]);
    try {
      const position = await requestDevicePosition();
      onChangeRef.current(formatCoordinate(position.latitude), formatCoordinate(position.longitude));
      setHint('Ubicación del dispositivo cargada. Si no es exacta, movela en el mapa.');
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
        Buscá la dirección para mover el pin, o marcalo en el mapa. Lo que queda en el pin es lo que se guarda.
      </p>
      <div className="row">
        <button type="button" className="secondary" onClick={() => void search()} disabled={busy || !street.trim()}>
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
      {candidates.length > 1 ? (
        <fieldset className="geocode-options">
          <legend>Elegí la dirección</legend>
          {candidates.map((candidate, index) => {
            const selected = samePin(candidate, latitude, longitude);
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
        onMove={placePin}
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
