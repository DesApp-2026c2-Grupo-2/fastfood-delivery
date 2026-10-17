import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type {
  ActiveBranch,
  ActiveBranchesResponse,
  Address,
  AvailableBranch,
  AvailableBranchesResponse,
} from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { type DevicePosition, requestDevicePosition } from '../../lib/geolocation';

function formatDistance(km: number): string {
  return `${km.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function BranchesPage() {
  const customer = isCustomer();
  const token = getToken() ?? '';
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [addressId, setAddressId] = useState('');
  const [result, setResult] = useState<AvailableBranchesResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [all, setAll] = useState<ActiveBranchesResponse | null>(null);
  const [allError, setAllError] = useState('');
  const [allLoading, setAllLoading] = useState(false);
  const allRequest = useRef(0);

  // Si el cliente cambia de ubicación rápido, solo cuenta la última respuesta.
  async function loadAll(query: string, auth = false) {
    const request = ++allRequest.current;
    setAllLoading(true);
    try {
      const response = await api<ActiveBranchesResponse>(
        query ? `/branches?${query}` : '/branches',
        auth ? { token } : {},
      );
      if (request !== allRequest.current) return;
      setAll(response);
      setAllError('');
    } catch (err) {
      if (request !== allRequest.current) return;
      setAllError(err instanceof Error ? err.message : 'No se pudieron cargar las sucursales');
    } finally {
      if (request === allRequest.current) setAllLoading(false);
    }
  }

  async function search(query: string, auth = false) {
    setLoading(true);
    setError('');
    void loadAll(query, auth);
    try {
      setResult(
        await api<AvailableBranchesResponse>(`/branches/available?${query}`, auth ? { token } : {}),
      );
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las sucursales');
    } finally {
      setLoading(false);
    }
  }

  function searchByAddress(id: string) {
    setAddressId(id);
    void search(new URLSearchParams({ addressId: id }).toString(), true);
  }

  async function searchByDevice() {
    setAddressId('');
    setLoading(true);
    setError('');
    let position: DevicePosition;
    try {
      position = await requestDevicePosition();
    } catch {
      setResult(null);
      setError(
        customer
          ? 'No pudimos obtener tu ubicación. Revisá el permiso del navegador o elegí una de tus direcciones.'
          : 'No pudimos obtener tu ubicación. Revisá el permiso de ubicación del navegador y probá de nuevo.',
      );
      setLoading(false);
      return;
    }
    await search(
      new URLSearchParams({
        lat: String(position.latitude),
        lng: String(position.longitude),
      }).toString(),
    );
  }

  useEffect(() => {
    if (!customer || !token) {
      void loadAll('');
      return;
    }
    let cancelled = false;
    api<Address[]>('/me/addresses', { token })
      .then((list) => {
        if (cancelled) return;
        setAddresses(list);
        const preferred = list.find((address) => address.isDefault) ?? list[0];
        if (preferred) searchByAddress(preferred.id);
        else void loadAll('');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar tus direcciones');
        void loadAll('');
      })
      .finally(() => {
        if (!cancelled) setAddressesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, token]);

  const hasLocation = Boolean(all?.branches.some((branch) => branch.distanceKm !== null));

  return (
    <section className="stack branches-page">
      <header className="page-head">
        <div>
          <h1>Sucursales</h1>
          <p className="muted">
            {customer
              ? 'Elegí una de tus direcciones o usá tu ubicación para ver qué sucursales te cubren.'
              : 'Mirá qué sucursales llegan a tu ubicación.'}
          </p>
        </div>
      </header>

      <div className="card branches-search">
        {addresses.length > 0 ? (
          <fieldset className="branches-addresses" disabled={loading}>
            <legend>Tus direcciones</legend>
            {addresses.map((address) => (
              <label key={address.id} className="checkbox address-choice">
                <input
                  type="radio"
                  name="branchesAddressId"
                  checked={addressId === address.id}
                  onChange={() => searchByAddress(address.id)}
                />
                <span>
                  {address.alias?.trim() ? (
                    <>
                      {address.alias.trim()}
                      <small className="muted"> · {address.street}</small>
                    </>
                  ) : (
                    address.street
                  )}
                  {address.isDefault ? <small className="muted"> · principal</small> : null}
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {customer && addressesLoaded && addresses.length === 0 ? (
          <p className="muted branches-hint">
            Todavía no tenés direcciones guardadas. <Link to="/account/addresses">Cargá una</Link> o usá tu
            ubicación.
          </p>
        ) : null}
        <button
          type="button"
          className={addresses.length > 0 ? 'secondary' : undefined}
          onClick={() => void searchByDevice()}
          disabled={loading}
        >
          {loading && !addressId ? 'Buscando…' : 'Usar mi ubicación'}
        </button>
      </div>

      <section className="stack branches-section" aria-labelledby="branches-covering-title">
        <h2 id="branches-covering-title">Las que me cubren</h2>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        {loading && addressId ? <p className="muted">Buscando sucursales…</p> : null}

        {!result && !loading && !error ? (
          <p className="muted branches-hint">
            {customer
              ? 'Elegí una dirección o usá tu ubicación para ver cuáles llegan.'
              : 'Usá tu ubicación para ver cuáles llegan.'}
          </p>
        ) : null}

        {result && !loading && result.branches.length === 0 ? (
          <div className="empty branches-empty">
            <p>
              <strong>
                No hay sucursales a menos de {result.radiusKm.toLocaleString('es-AR')} km
                {addressId ? ' de esta dirección' : ' de tu ubicación'}.
              </strong>
            </p>
            <p className="muted">
              Por ahora no podemos hacer envíos ahí. Probá con otra dirección
              {customer ? (
                <>
                  {' '}
                  o <Link to="/account/addresses">cargá una nueva</Link>
                </>
              ) : null}
              .
            </p>
          </div>
        ) : null}

        {result && !loading && result.branches.length > 0 ? (
          <>
            <p className="muted branches-radius">
              {result.branches.length === 1
                ? '1 sucursal'
                : `${result.branches.length} sucursales`}{' '}
              a menos de {result.radiusKm.toLocaleString('es-AR')} km
            </p>
            <ul className="branch-list">
              {result.branches.map((branch, index) => (
                <BranchCard key={branch.id} branch={branch} assigned={index === 0} />
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="stack branches-section" aria-labelledby="branches-all-title">
        <h2 id="branches-all-title">Todas las sucursales</h2>
        <p className="muted branches-hint">
          {hasLocation
            ? 'Todas las que están abiertas a pedidos, de la más cercana a la más lejana.'
            : 'Todas las que están abiertas a pedidos. Elegí una ubicación para ver a qué distancia están.'}
        </p>

        {allError ? (
          <p className="error" role="alert">
            {allError}
          </p>
        ) : null}

        {allLoading && !all ? <p className="muted">Cargando sucursales…</p> : null}

        {all && all.branches.length === 0 ? (
          <p className="empty">Por ahora no hay sucursales abiertas.</p>
        ) : null}

        {all && all.branches.length > 0 ? (
          <ul className="branch-list" aria-busy={allLoading}>
            {all.branches.map((branch) => (
              <ActiveBranchCard
                key={branch.id}
                branch={branch}
                place={addressId ? 'tu dirección' : 'tu ubicación'}
              />
            ))}
          </ul>
        ) : null}
      </section>
    </section>
  );
}

function BranchCard({ branch, assigned }: { branch: AvailableBranch; assigned: boolean }) {
  return (
    <li className={assigned ? 'card branch-card branch-card--assigned' : 'card branch-card'}>
      <div className="branch-card-title">
        <strong>{branch.name}</strong>
        <span className="branch-distance">{formatDistance(branch.distanceKm)}</span>
      </div>
      {assigned ? <span className="badge branch-assigned">La más cercana</span> : null}
      <p className="branch-line">{branch.address}</p>
      <p className="branch-line muted">{branch.openingHours}</p>
      <p className="branch-line">
        <a href={`tel:${branch.phone.replace(/\s/g, '')}`}>{branch.phone}</a>
      </p>
    </li>
  );
}

function ActiveBranchCard({ branch, place }: { branch: ActiveBranch; place: string }) {
  return (
    <li className="card branch-card">
      <div className="branch-card-title">
        <strong>{branch.name}</strong>
        {branch.distanceKm !== null ? (
          <span className="branch-distance">{formatDistance(branch.distanceKm)}</span>
        ) : null}
      </div>
      {branch.withinRadius === true ? <span className="badge">Llega a {place}</span> : null}
      {branch.withinRadius === false ? <span className="badge badge--off">Fuera de tu zona</span> : null}
      <p className="branch-line">{branch.address}</p>
      <p className="branch-line muted">{branch.openingHours}</p>
      <p className="branch-line">
        <a href={`tel:${branch.phone.replace(/\s/g, '')}`}>{branch.phone}</a>
      </p>
    </li>
  );
}
