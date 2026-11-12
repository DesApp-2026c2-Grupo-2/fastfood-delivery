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

type DayHours = {
  enabled: boolean;
  opensAt: string;
  closesAt: string;
  split: boolean;
  opensAt2: string;
  closesAt2: string;
};

type FormState = AddressParts & {
  name: string;
  latitude: string;
  longitude: string;
  openingHours: string;
  hours: DayHours[];
  phone: string;
  active: boolean;
};

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

type ErrorAnchor = 'name' | 'address' | 'phone' | 'latitude' | 'longitude' | 'hours';

function defaultHours(enabled: boolean): DayHours[] {
  return Array.from({ length: 7 }, () => ({
    enabled,
    opensAt: '10:00',
    closesAt: '23:00',
    split: false,
    opensAt2: '19:00',
    closesAt2: '23:00',
  }));
}

function withSplit(day: DayHours, split: boolean): DayHours {
  if (!split) return { ...day, split: false };
  if (day.closesAt <= day.opensAt2) return { ...day, split: true };
  if (day.opensAt >= '16:00') {
    return { ...day, split: true, opensAt: '11:00', closesAt: '15:00', opensAt2: day.opensAt, closesAt2: day.closesAt };
  }
  return { ...day, split: true, closesAt: day.opensAt < '15:00' ? '15:00' : day.opensAt, opensAt2: '19:00', closesAt2: '23:00' };
}

const emptyForm: FormState = {
  name: '',
  street: '',
  city: '',
  province: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  openingHours: 'Lun-Dom 10:00-23:00',
  hours: defaultHours(true),
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

function hoursFromBranch(branch: Branch): DayHours[] {
  const days = defaultHours(false);
  const sorted = [...(branch.hours ?? [])].sort((a, b) => a.weekday - b.weekday || (a.slot ?? 0) - (b.slot ?? 0));
  for (const hour of sorted) {
    if (hour.weekday < 0 || hour.weekday > 6) continue;
    const day = days[hour.weekday];
    if (!day.enabled) {
      days[hour.weekday] = { ...day, enabled: true, opensAt: hour.opensAt, closesAt: hour.closesAt, split: false };
    } else {
      days[hour.weekday] = { ...day, split: true, opensAt2: hour.opensAt, closesAt2: hour.closesAt };
    }
  }
  return days;
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
    hours: branch.hours?.length ? hoursFromBranch(branch) : defaultHours(false),
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
  const [errorAnchor, setErrorAnchor] = useState<ErrorAnchor | null>(null);
  const [invalidDay, setInvalidDay] = useState<number | null>(null);
  const [errorOffscreen, setErrorOffscreen] = useState(false);
  const [errorNonce, setErrorNonce] = useState(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const anchorRefs = useRef<Partial<Record<ErrorAnchor, HTMLElement | null>>>({});
  const dayRefs = useRef<Array<HTMLDivElement | null>>([]);
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

  function reportError(message: string, anchor: ErrorAnchor | null = null, day: number | null = null) {
    setError(message);
    setErrorAnchor(anchor);
    setInvalidDay(day);
    if (message) setErrorNonce((current) => current + 1);
  }

  function clearError() {
    setError('');
    setErrorAnchor(null);
    setInvalidDay(null);
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    clearError();
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

  useEffect(() => {
    const node = errorRef.current;
    if (!node || !error) {
      setErrorOffscreen(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setErrorOffscreen(!entry.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [error]);

  useEffect(() => {
    if (!errorNonce || missing) return;
    const node =
      (invalidDay != null ? dayRefs.current[invalidDay] : null) ??
      (errorAnchor ? anchorRefs.current[errorAnchor] : null);
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const pad = 72;
    if (rect.top >= pad && rect.bottom <= window.innerHeight - pad) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [errorNonce, invalidDay, errorAnchor, missing]);

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
    clearError();
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
      reportError('Escribí la calle y el número para buscar las coordenadas.');
      setLocationHint('');
      return;
    }

    const suggestOnly = onlyStreet(parts);
    setGeocoding(true);
    clearError();
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
      reportError(err instanceof Error ? err.message : 'No se pudo buscar la dirección');
    } finally {
      setGeocoding(false);
    }
  }

  async function useDeviceLocation() {
    setLocating(true);
    clearError();
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
      reportError(err instanceof Error ? err.message : 'No pudimos obtener tu ubicación; cargala a mano.');
    } finally {
      setLocating(false);
    }
  }

  function patchDay(weekday: number, patch: Partial<DayHours>) {
    setForm((current) => ({
      ...current,
      hours: current.hours.map((item, index) => (index === weekday ? { ...item, ...patch } : item)),
    }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!form.name.trim()) {
      reportError('Completá el nombre.', 'name');
      return;
    }
    const addressError = addressPartsError(formParts(form));
    if (addressError) {
      reportError(addressError, 'address');
      return;
    }
    const enabled = form.hours
      .map((day, weekday) => ({ ...day, weekday }))
      .filter((day) => day.enabled);
    if (enabled.length === 0 && !form.openingHours.trim()) {
      reportError('Marcá al menos un día o completá el texto de horario.', 'hours');
      return;
    }
    const timeOk = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    for (const day of enabled) {
      if (!timeOk(day.opensAt) || !timeOk(day.closesAt) || (day.split && (!timeOk(day.opensAt2) || !timeOk(day.closesAt2)))) {
        reportError(`${DAY_NAMES[day.weekday]}: el horario tiene que ser HH:mm.`, 'hours', day.weekday);
        return;
      }
      if (day.closesAt <= day.opensAt || (day.split && day.closesAt2 <= day.opensAt2)) {
        reportError(`${DAY_NAMES[day.weekday]}: el cierre tiene que ser después de la apertura.`, 'hours', day.weekday);
        return;
      }
      if (day.split && day.opensAt2 < day.closesAt) {
        reportError(
          `${DAY_NAMES[day.weekday]}: la segunda franja tiene que empezar cuando termina la primera.`,
          'hours',
          day.weekday,
        );
        return;
      }
    }
    if (!form.phone.trim()) {
      reportError('Completá el teléfono.', 'phone');
      return;
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      reportError('Latitud inválida (-90 a 90).', 'latitude');
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      reportError('Longitud inválida (-180 a 180).', 'longitude');
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
      openingHours: enabled.length > 0 ? form.openingHours.trim() || 'Horario por día' : form.openingHours.trim(),
      hours: enabled.flatMap(({ weekday, opensAt, closesAt, split, opensAt2, closesAt2 }) => {
        const first = { weekday, opensAt, closesAt };
        return split ? [first, { weekday, opensAt: opensAt2, closesAt: closesAt2 }] : [first];
      }),
      phone: form.phone.trim(),
      active: form.active,
    };

    setSaving(true);
    clearError();
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
      reportError(err instanceof Error ? err.message : 'No se pudo guardar');
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
        <p className="error branch-alert" role="alert" ref={errorRef}>
          {error}
        </p>
      ) : null}

      <form className="card form branch-form" onSubmit={onSubmit} noValidate>
        <div className="branch-form-grid">
          <div className="branch-form-col">
            <label ref={(node) => { anchorRefs.current.name = node; }}>
              Nombre
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                maxLength={120}
                placeholder="Mordi Centro"
              />
            </label>
            <div ref={(node) => { anchorRefs.current.address = node; }}>
              <AddressFields
                value={formParts(form)}
                onChange={(patch) => {
                  setForm((current) => ({ ...current, ...patch }));
                  if (patch.street !== undefined) clearCandidates();
                }}
                disabled={saving}
              />
            </div>
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
              <label ref={(node) => { anchorRefs.current.latitude = node; }}>
                Latitud
                <input
                  value={form.latitude}
                  onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                  inputMode="decimal"
                  placeholder="-34.6037"
                />
              </label>
              <label ref={(node) => { anchorRefs.current.longitude = node; }}>
                Longitud
                <input
                  value={form.longitude}
                  onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                  inputMode="decimal"
                  placeholder="-58.3816"
                />
              </label>
            </div>
            <label ref={(node) => { anchorRefs.current.phone = node; }}>
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
          </div>
          <fieldset className="hours-grid" ref={(node) => { anchorRefs.current.hours = node; }}>
              <legend>Horarios</legend>
              {form.hours.map((day, weekday) => (
                <div
                  className={invalidDay === weekday ? 'hours-day is-invalid' : 'hours-day'}
                  key={DAY_NAMES[weekday]}
                  ref={(node) => {
                    dayRefs.current[weekday] = node;
                  }}
                >
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(event) => patchDay(weekday, { enabled: event.target.checked })}
                    />
                    {DAY_NAMES[weekday]}
                  </label>
                  <input
                    className="hours-time"
                    inputMode="numeric"
                    aria-label={`${DAY_NAMES[weekday]} abre`}
                    value={day.opensAt}
                    placeholder="10:00"
                    maxLength={5}
                    disabled={!day.enabled}
                    onChange={(event) => patchDay(weekday, { opensAt: event.target.value })}
                  />
                  <span className="hours-dash" aria-hidden="true">
                    –
                  </span>
                  <input
                    className="hours-time"
                    inputMode="numeric"
                    aria-label={`${DAY_NAMES[weekday]} cierra`}
                    value={day.closesAt}
                    placeholder="15:00"
                    maxLength={5}
                    disabled={!day.enabled}
                    onChange={(event) => patchDay(weekday, { closesAt: event.target.value })}
                  />
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={day.split}
                      disabled={!day.enabled}
                      onChange={(event) => patchDay(weekday, withSplit(day, event.target.checked))}
                    />
                    Partido
                  </label>
                  <input
                    className="hours-time"
                    inputMode="numeric"
                    aria-label={`${DAY_NAMES[weekday]} segunda apertura`}
                    value={day.opensAt2}
                    placeholder="19:00"
                    maxLength={5}
                    disabled={!day.enabled || !day.split}
                    onChange={(event) => patchDay(weekday, { opensAt2: event.target.value })}
                  />
                  <span className="hours-dash" aria-hidden="true">
                    –
                  </span>
                  <input
                    className="hours-time"
                    inputMode="numeric"
                    aria-label={`${DAY_NAMES[weekday]} segundo cierre`}
                    value={day.closesAt2}
                    placeholder="23:00"
                    maxLength={5}
                    disabled={!day.enabled || !day.split}
                    onChange={(event) => patchDay(weekday, { closesAt2: event.target.value })}
                  />
                </div>
              ))}
            </fieldset>
            {form.hours.some((day) => day.enabled) ? (
              <p className="field-hint hours-note">Si el pedido entra con la sucursal cerrada, se puede dejar para la próxima apertura.</p>
            ) : (
              <label className="hours-note">
                Texto de horario
                <input
                  value={form.openingHours}
                  onChange={(event) => setForm((current) => ({ ...current, openingHours: event.target.value }))}
                  maxLength={200}
                  placeholder="Lun-Dom 10:00-23:00"
                />
                <span className="field-hint">Sin días marcados se muestra este texto y el pedido no se frena.</span>
              </label>
            )}
            <div className="row hours-note">
              <button type="submit" disabled={busy}>
                {saving ? 'Guardando…' : id ? 'Guardar cambios' : 'Crear sucursal'}
              </button>
              <button type="button" className="secondary" onClick={() => navigate('/admin/branches')}>
                Cancelar
              </button>
            </div>
        </div>
      </form>
      {error && errorOffscreen ? (
        <p className="error branch-alert-float" aria-hidden="true">
          {error}
        </p>
      ) : null}
    </section>
  );
}
