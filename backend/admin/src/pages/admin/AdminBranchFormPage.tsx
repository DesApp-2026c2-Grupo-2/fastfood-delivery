import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Branch } from '../../api/types';
import { getToken } from '../../auth/session';
import { AddressFields } from '../../components/AddressFields';
import { BranchPinMap } from '../../components/BranchPinMap';
import { type AddressParts, addressPartsError, normalizePostalCode } from '../../lib/address';
import {
  addressLines,
  candidateDetails,
  type GeocodeCandidate,
  pinParts,
  reverseGeocode,
  searchBranchAddress,
} from '../../lib/geocode';
import { formatCoordinate, requestDevicePosition } from '../../lib/geolocation';

type FormState = AddressParts & {
  name: string;
  latitude: string;
  longitude: string;
  openingHours: string;
  phone: string;
  active: boolean;
};

const emptyForm: FormState = {
  name: '',
  street: '',
  city: '',
  province: '',
  postalCode: '',
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

function formParts(form: FormState): AddressParts {
  return { street: form.street, city: form.city, province: form.province, postalCode: form.postalCode };
}

/**
 * La dirección como la escribió el admin: ciudad, provincia y CP que completó el mapa y no se tocaron quedan
 * vacíos, porque pueden ser de otro lugar que la calle buscada.
 */
function typedAddress(parts: AddressParts, autoFilled: Partial<AddressParts>): AddressParts {
  const result = { ...parts };
  for (const key of ['city', 'province', 'postalCode'] as const) {
    if (parts[key].trim() === autoFilled[key]) result[key] = '';
  }
  return result;
}

function onlyStreet(parts: AddressParts) {
  return !parts.city.trim() && !parts.province && !parts.postalCode.trim();
}

function branchToForm(branch: Branch): FormState {
  return {
    name: branch.name,
    street: branch.address,
    city: branch.city ?? '',
    province: branch.province ?? '',
    postalCode: branch.postalCode ?? '',
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
  // Sugerencias sin elegir: la lista se muestra aunque haya una sola y el pin todavía no se movió.
  const [mustChoose, setMustChoose] = useState(false);
  const formRef = useRef(form);
  formRef.current = form;
  // Lo que completó el mapa: elegir otro candidato lo reemplaza, lo escrito a mano no se pisa.
  const autoFilledRef = useRef<Partial<AddressParts>>({});
  // Si el pin se mueve de nuevo antes de que vuelva la dirección, solo cuenta el último punto.
  const pinRequestRef = useRef(0);

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

  function clearCandidates() {
    setCandidates([]);
    setMustChoose(false);
  }

  function fill(patch: Partial<AddressParts>) {
    if (Object.keys(patch).length === 0) return;
    autoFilledRef.current = { ...autoFilledRef.current, ...patch };
    setForm((current) => ({ ...current, ...patch }));
  }

  function setPin(latitude: number, longitude: number) {
    setForm((current) => ({
      ...current,
      latitude: formatCoordinate(latitude),
      longitude: formatCoordinate(longitude),
    }));
  }

  function applyCandidate(candidate: GeocodeCandidate, hint: string) {
    pinRequestRef.current += 1;
    setPin(candidate.latitude, candidate.longitude);
    const current = formRef.current;
    const details = candidateDetails(candidate);
    const patch: Partial<AddressParts> = {};
    for (const key of Object.keys(details) as (keyof AddressParts)[]) {
      const value = current[key].trim();
      if (!value || value === autoFilledRef.current[key]) patch[key] = details[key];
    }
    fill(patch);
    setMustChoose(false);
    setLocationHint(hint);
  }

  /** Lee la dirección del punto y la copia al formulario. `stale`: el pin ya se movió a otro lado. */
  async function fillFromPin(latitude: number, longitude: number): Promise<'ok' | 'failed' | 'stale'> {
    const request = ++pinRequestRef.current;
    try {
      const found = await reverseGeocode(latitude, longitude);
      if (request !== pinRequestRef.current) return 'stale';
      fill(pinParts(formParts(formRef.current), found));
      return 'ok';
    } catch {
      return request === pinRequestRef.current ? 'failed' : 'stale';
    }
  }

  async function placePin(latitude: number, longitude: number) {
    setPin(latitude, longitude);
    clearCandidates();
    setError('');
    setLocationHint('Punto marcado. Buscando la dirección de ese punto…');
    const result = await fillFromPin(latitude, longitude);
    if (result === 'stale') return;
    setLocationHint(
      result === 'ok'
        ? 'Completamos la dirección con el punto del mapa. Revisá la calle y el número.'
        : 'Punto marcado. No pudimos leer la dirección de ese punto: completala a mano.',
    );
  }

  async function searchCoordinates() {
    const parts = typedAddress(formParts(form), autoFilledRef.current);
    if (!parts.street.trim()) {
      setError('Escribí la calle y el número para buscar las coordenadas.');
      setLocationHint('');
      return;
    }

    const suggestOnly = onlyStreet(parts);
    setGeocoding(true);
    setError('');
    setLocationHint('');
    try {
      const list = await searchBranchAddress(parts, token);
      setCandidates(list);
      if (suggestOnly) {
        setMustChoose(true);
        setLocationHint(
          `${
            list.length > 1
              ? `Hay ${list.length} direcciones posibles. Elegí la del local y completamos ciudad, provincia y CP.`
              : 'Encontramos esta dirección. Si es la del local, elegila y completamos ciudad, provincia y CP.'
          } Si no está, escribí la ciudad o la provincia y buscá de nuevo.`,
        );
        return;
      }
      applyCandidate(
        list[0],
        list.length > 1
          ? `Hay ${list.length} coincidencias. Tocá la que corresponde al local.`
          : 'Encontramos la dirección. Si el pin no cae justo, movelo en el mapa.',
      );
    } catch (err) {
      clearCandidates();
      setError(err instanceof Error ? err.message : 'No se pudo buscar la dirección');
    } finally {
      setGeocoding(false);
    }
  }

  async function useDeviceLocation() {
    setLocating(true);
    setError('');
    setLocationHint('');
    clearCandidates();
    try {
      const position = await requestDevicePosition();
      setPin(position.latitude, position.longitude);
      const result = await fillFromPin(position.latitude, position.longitude);
      if (result === 'stale') return;
      setLocationHint(
        result === 'ok'
          ? 'Completamos la dirección con tu ubicación. Revisala y, si el pin no es exacto, movelo en el mapa.'
          : 'Ubicación cargada. No pudimos leer la dirección de ese punto: completala a mano.',
      );
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
    if (!form.name.trim()) {
      setError('Completá el nombre.');
      return;
    }
    const addressError = addressPartsError(formParts(form));
    if (addressError) {
      setError(addressError);
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
      address: form.street.trim(),
      city: form.city.trim(),
      province: form.province,
      postalCode: normalizePostalCode(form.postalCode),
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

  const busy = geocoding || locating || saving;

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>{id ? 'Editar sucursal' : 'Crear sucursal'}</h1>
          <p className="muted">
            Buscá la dirección o marcá el punto en el mapa: completamos calle, ciudad, provincia y CP. Lo que queda en
            el pin es lo que se guarda.
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
            <AddressFields
              value={formParts(form)}
              onChange={(patch) => {
                setForm((current) => ({ ...current, ...patch }));
                if (patch.street !== undefined) clearCandidates();
              }}
              disabled={saving}
            />
            <p className="field-hint">
              Con solo la calle y el número, la búsqueda sugiere direcciones: elegí la del local. Con ciudad, provincia o
              CP busca más preciso.
            </p>
            <div className="row">
              <button
                type="button"
                className="secondary"
                disabled={busy || !form.street.trim()}
                onClick={() => void searchCoordinates()}
              >
                {geocoding ? 'Buscando…' : 'Buscar en el mapa'}
              </button>
              <button type="button" className="secondary" disabled={busy} onClick={() => void useDeviceLocation()}>
                {locating ? 'Obteniendo ubicación…' : 'Usar mi ubicación'}
              </button>
            </div>
            {locationHint ? (
              <p className="muted" role="status">
                {locationHint}
              </p>
            ) : null}
            {candidates.length > 1 || (mustChoose && candidates.length > 0) ? (
              <fieldset className="geocode-options">
                <legend>Elegí la dirección</legend>
                {candidates.map((candidate, index) => {
                  const selected = !mustChoose && samePin(candidate, form.latitude, form.longitude);
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
              onMove={(latitude, longitude) => void placePin(latitude, longitude)}
            />
            <p className="field-hint">
              Si la búsqueda no encuentra la calle, hacé clic en el mapa o arrastrá el pin. Latitud, longitud y la
              dirección siguen al pin.
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
              <button type="submit" disabled={busy}>
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
