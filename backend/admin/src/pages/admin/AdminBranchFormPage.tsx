import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Branch } from '../../api/types';
import { getToken } from '../../auth/session';
import { BranchPinMap } from '../../components/BranchPinMap';
import { formatCoordinate, requestDevicePosition } from '../../lib/geolocation';

type GeocodeCandidate = {
  latitude: number;
  longitude: number;
  displayName: string;
  name?: string;
  houseNumber?: string;
  postcode?: string;
  locality?: string;
};

type GeocodeResult = GeocodeCandidate & {
  candidates?: GeocodeCandidate[];
};

type FormState = {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  openingHours: string;
  phone: string;
  active: boolean;
};

const emptyForm: FormState = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  openingHours: 'Lun-Dom 10:00-23:00',
  phone: '',
  active: true,
};

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

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

function addressLines(candidate: GeocodeCandidate) {
  const parts = candidate.displayName
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const title = candidate.houseNumber
    ? [candidate.houseNumber, ...parts.slice(0, 2)].join(', ')
    : parts.slice(0, 2).join(', ') || candidate.displayName;
  const place = parts.slice(2, 5).join(' · ');
  const postcode =
    candidate.postcode && !`${title} ${place}`.includes(candidate.postcode) ? candidate.postcode : '';
  return {
    title,
    detail: [place, postcode].filter(Boolean).join(' · '),
  };
}

function branchToForm(branch: Branch): FormState {
  return {
    name: branch.name,
    address: branch.address,
    latitude: String(toNumber(branch.latitude)),
    longitude: String(toNumber(branch.longitude)),
    openingHours: branch.openingHours,
    phone: branch.phone,
    active: branch.active,
  };
}

export function AdminBranchFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = getToken() ?? '';
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationHint, setLocationHint] = useState('');
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api<Branch>(`/admin/branches/${id}`, { token })
      .then((branch) => {
        if (!cancelled) setForm(branchToForm(branch));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setMissing(true);
          setError(err instanceof Error ? err.message : 'No se pudo cargar la sucursal');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  function applyCandidate(candidate: GeocodeCandidate, hint: string) {
    setForm((current) => ({
      ...current,
      latitude: formatCoordinate(candidate.latitude),
      longitude: formatCoordinate(candidate.longitude),
    }));
    setLocationHint(hint);
  }

  function placePin(latitude: number, longitude: number) {
    setForm((current) => ({
      ...current,
      latitude: formatCoordinate(latitude),
      longitude: formatCoordinate(longitude),
    }));
    setError('');
    setLocationHint('Punto marcado en el mapa. Esas coordenadas se guardan con la sucursal.');
  }

  async function searchCoordinates() {
    const address = form.address.trim();
    if (!address) {
      setError('Escribí la dirección para buscar las coordenadas.');
      setLocationHint('');
      return;
    }

    setGeocoding(true);
    setError('');
    setLocationHint('');
    try {
      const result = await api<GeocodeResult>('/admin/branches/geocode', {
        method: 'POST',
        token,
        body: JSON.stringify({ address }),
      });
      const list = result.candidates?.length
        ? result.candidates
        : [{ latitude: result.latitude, longitude: result.longitude, displayName: result.displayName }];
      const first = list[0];
      setCandidates(list);
      applyCandidate(
        first,
        list.length > 1
          ? `Hay ${list.length} coincidencias. Tocá la que corresponde al local.`
          : 'Encontramos la dirección. Si el pin no cae justo, movelo en el mapa.',
      );
    } catch (err) {
      setCandidates([]);
      setError(err instanceof Error ? err.message : 'No se pudo buscar la dirección');
    } finally {
      setGeocoding(false);
    }
  }

  async function useDeviceLocation() {
    setLocating(true);
    setError('');
    setLocationHint('');
    setCandidates([]);
    try {
      const position = await requestDevicePosition();
      setForm((current) => ({
        ...current,
        latitude: formatCoordinate(position.latitude),
        longitude: formatCoordinate(position.longitude),
      }));
      setLocationHint('Ubicación del dispositivo cargada. Podés ajustarla si hace falta.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos obtener tu ubicación; cargala a mano.');
    } finally {
      setLocating(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!form.name.trim() || !form.address.trim()) {
      setError('Completá nombre y dirección.');
      return;
    }
    if (!form.openingHours.trim()) {
      setError('Completá el horario.');
      return;
    }
    if (!form.phone.trim()) {
      setError('Completá el teléfono.');
      return;
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setError('Latitud inválida (-90 a 90).');
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError('Longitud inválida (-180 a 180).');
      return;
    }

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      latitude,
      longitude,
      openingHours: form.openingHours.trim(),
      phone: form.phone.trim(),
      active: form.active,
    };

    setSaving(true);
    setError('');
    try {
      if (id) {
        await api(`/admin/branches/${id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(payload),
        });
        navigate('/admin/branches', { state: { notice: `Sucursal “${payload.name}” actualizada.` } });
      } else {
        await api('/admin/branches', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        });
        navigate('/admin/branches', { state: { notice: `Sucursal “${payload.name}” creada.` } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Cargando…</p>;

  if (missing) {
    return (
      <section className="stack">
        <p className="error" role="alert">
          {error || 'Sucursal no encontrada'}
        </p>
        <Link to="/admin/branches">Volver al listado</Link>
      </section>
    );
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>{id ? 'Editar sucursal' : 'Crear sucursal'}</h1>
          <p className="muted">
            Buscá la dirección para mover el pin, o marcalo en el mapa. Lo que queda en el pin es lo que se guarda.
          </p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="card form branch-form" onSubmit={onSubmit} noValidate>
        <div className="branch-form-grid">
          <div className="branch-form-col">
            <label>
              Nombre
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                maxLength={120}
                placeholder="Mordi Centro"
              />
            </label>
            <label>
              Dirección
              <input
                value={form.address}
                onChange={(event) => {
                  setForm((current) => ({ ...current, address: event.target.value }));
                  setCandidates([]);
                }}
                maxLength={200}
                placeholder="Av. Corrientes 1234, CABA"
              />
            </label>
            <p className="field-hint">
              Buscar coordenadas usa la dirección de arriba. Si aparece más de un punto, elegí uno de la lista.
            </p>
            <div className="row">
              <button
                type="button"
                className="secondary"
                disabled={geocoding || locating || saving || !form.address.trim()}
                onClick={() => void searchCoordinates()}
              >
                {geocoding ? 'Buscando…' : 'Buscar coordenadas'}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={geocoding || locating || saving}
                onClick={() => void useDeviceLocation()}
              >
                {locating ? 'Obteniendo ubicación…' : 'Usar mi ubicación'}
              </button>
            </div>
            {locationHint ? (
              <p className="muted" role="status">
                {locationHint}
              </p>
            ) : null}
            {candidates.length > 1 ? (
              <fieldset className="geocode-options">
                <legend>Elegí la dirección</legend>
                {candidates.map((candidate, index) => {
                  const selected = samePin(candidate, form.latitude, form.longitude);
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
            <BranchPinMap
              latitude={coordinateOrNull(form.latitude, -90, 90)}
              longitude={coordinateOrNull(form.longitude, -180, 180)}
              onMove={placePin}
            />
            <p className="field-hint">
              Si la búsqueda no encuentra la calle, hacé clic en el mapa o arrastrá el pin. Latitud y longitud siguen
              al pin.
            </p>
          </div>
          <div className="branch-form-col">
            <div className="row">
              <label>
                Latitud
                <input
                  value={form.latitude}
                  onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                  inputMode="decimal"
                  placeholder="-34.6037"
                />
              </label>
              <label>
                Longitud
                <input
                  value={form.longitude}
                  onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                  inputMode="decimal"
                  placeholder="-58.3816"
                />
              </label>
            </div>
            <label>
              Horarios
              <input
                value={form.openingHours}
                onChange={(event) => setForm((current) => ({ ...current, openingHours: event.target.value }))}
                maxLength={200}
                placeholder="Lun-Dom 10:00-23:00"
              />
            </label>
            <label>
              Teléfono
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                maxLength={40}
                placeholder="+54 11 4000-0000"
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
              />
              Sucursal activa (puede recibir pedidos nuevos)
            </label>
            <div className="row">
              <button type="submit" disabled={saving || geocoding || locating}>
                {saving ? 'Guardando…' : id ? 'Guardar cambios' : 'Crear sucursal'}
              </button>
              <button type="button" className="secondary" onClick={() => navigate('/admin/branches')}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
