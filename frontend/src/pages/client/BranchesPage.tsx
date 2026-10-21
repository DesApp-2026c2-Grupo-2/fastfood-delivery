import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type {
  ActiveBranch,
  ActiveBranchesResponse,
  Address,
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

  const covering = all?.branches.filter((branch) => branch.withinRadius === true) ?? [];
  const farther = all?.branches.filter((branch) => branch.withinRadius === false) ?? [];
  const withoutPlace = all?.branches.filter((branch) => branch.withinRadius == null) ?? [];
  const usingDevice = Boolean(result) && !addressId;

  return (
    <section className="stack branches-page">
      <header className="page-head">
        <div>
          <h1>Sucursales</h1>
          <p className="muted">Elegí desde dónde mirar y te mostramos cuáles te llegan.</p>
        </div>
      </header>

      <div className="branch-picks">
        {addresses.map((address) => {
          const label = address.alias?.trim() || address.street;
          return (
            <button
              key={address.id}
              type="button"
              className={addressId === address.id ? 'chip chip-active' : 'chip'}
              onClick={() => searchByAddress(address.id)}
              disabled={loading}
            >
              {label}
            </button>
          );
        })}
        <button
          type="button"
          className={usingDevice ? 'chip chip-active' : 'chip'}
          onClick={() => void searchByDevice()}
          disabled={loading}
        >
          {loading && !addressId ? 'Buscando…' : 'Mi ubicación'}
        </button>
      </div>

      {customer && addressesLoaded && addresses.length === 0 ? (
        <p className="muted branches-hint">
          Todavía no tenés direcciones. <Link to="/account/addresses">Cargá una</Link> o usá tu ubicación.
        </p>
      ) : null}

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {allError ? (
        <p className="error" role="alert">
          {allError}
        </p>
      ) : null}

      {allLoading && !all ? <p className="muted">Cargando sucursales…</p> : null}
      {loading && addressId ? <p className="muted">Buscando sucursales…</p> : null}

      {!result && !loading && !error && withoutPlace.length > 0 ? (
        <p className="muted branches-hint">Elegí una dirección o tu ubicación para ver la distancia.</p>
      ) : null}

      {result && !loading && result.branches.length === 0 ? (
        <div className="empty branches-empty">
          <p>
            <strong>Ninguna llega a menos de {result.radiusKm.toLocaleString('es-AR')} km.</strong>
          </p>
          <p className="muted">
            Por ahora no hacemos envíos ahí.
            {customer ? (
              <>
                {' '}
                Probá otra dirección o <Link to="/account/addresses">cargá una nueva</Link>.
              </>
            ) : (
              ' Probá desde otro punto.'
            )}
          </p>
        </div>
      ) : null}

      {covering.length > 0 ? (
        <BranchGroup
          title="Te cubren"
          hint={
            result
              ? `A menos de ${result.radiusKm.toLocaleString('es-AR')} km`
              : undefined
          }
        >
          {covering.map((branch, index) => (
            <BranchSpot key={branch.id} branch={branch} nearest={index === 0} />
          ))}
        </BranchGroup>
      ) : null}

      {farther.length > 0 ? (
        <BranchGroup title="Más lejos" hint="Abiertas, pero fuera de la zona de envío">
          {farther.map((branch) => (
            <BranchSpot key={branch.id} branch={branch} />
          ))}
        </BranchGroup>
      ) : null}

      {withoutPlace.length > 0 ? (
        <BranchGroup title="Abiertas ahora">
          {withoutPlace.map((branch) => (
            <BranchSpot key={branch.id} branch={branch} />
          ))}
        </BranchGroup>
      ) : null}

      {all && all.branches.length === 0 ? <p className="empty">Por ahora no hay sucursales abiertas.</p> : null}
    </section>
  );
}

function BranchGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="branch-group">
      <header className="branch-group-head">
        <h2>{title}</h2>
        {hint ? <p>{hint}</p> : null}
      </header>
      <ul className="branch-spot-list">{children}</ul>
    </section>
  );
}

function BranchSpot({ branch, nearest = false }: { branch: ActiveBranch; nearest?: boolean }) {
  const far = branch.withinRadius === false;
  return (
    <li className={nearest ? 'branch-spot is-near' : far ? 'branch-spot is-far' : 'branch-spot'}>
      <div className="branch-spot-top">
        <strong>{branch.name}</strong>
        {branch.distanceKm !== null ? (
          <span className="branch-distance">{formatDistance(branch.distanceKm)}</span>
        ) : null}
      </div>
      <p className="branch-spot-address">{branch.address}</p>
      <p className="branch-spot-meta">
        <span>{branch.openingHours}</span>
        <a href={`tel:${branch.phone.replace(/\s/g, '')}`}>{branch.phone}</a>
      </p>
      {nearest ? <span className="badge">La más cercana</span> : null}
      {!nearest && branch.withinRadius === true ? <span className="badge">Te cubre</span> : null}
      {far ? <span className="badge badge--off">Fuera de tu zona</span> : null}
    </li>
  );
}
