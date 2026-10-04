import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Address, AvailableBranch, AvailableBranchesResponse } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { requestDevicePosition } from '../../lib/geolocation';

function formatDistance(km: number): string {
  return `${km.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function BranchesPage() {
  const customer = isCustomer();
  const token = getToken() ?? '';
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState('');
  const [result, setResult] = useState<AvailableBranchesResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function search(query: string, auth = false) {
    setLoading(true);
    setError('');
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
    try {
      const position = await requestDevicePosition();
      await search(
        new URLSearchParams({
          lat: String(position.latitude),
          lng: String(position.longitude),
        }).toString(),
      );
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'No pudimos obtener tu ubicación');
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!customer || !token) return;
    let cancelled = false;
    api<Address[]>('/me/addresses', { token })
      .then((list) => {
        if (cancelled) return;
        setAddresses(list);
        const preferred = list.find((address) => address.isDefault) ?? list[0];
        if (preferred) searchByAddress(preferred.id);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar tus direcciones');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, token]);

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
        <button
          type="button"
          className={addresses.length > 0 ? 'secondary' : undefined}
          onClick={() => void searchByDevice()}
          disabled={loading}
        >
          {loading && !addressId ? 'Buscando…' : 'Usar mi ubicación'}
        </button>
      </div>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <>
          <p className="muted">
            Sucursales a menos de {result.radiusKm.toLocaleString('es-AR')} km
          </p>
          <ul className="branch-list">
            {result.branches.map((branch, index) => (
              <BranchCard key={branch.id} branch={branch} assigned={index === 0} />
            ))}
          </ul>
        </>
      ) : null}
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
      {assigned ? <span className="badge">Te atiende esta sucursal</span> : null}
      <p className="muted">{branch.address}</p>
      <p className="muted">{branch.openingHours}</p>
      <p className="muted">
        <a href={`tel:${branch.phone.replace(/\s/g, '')}`}>{branch.phone}</a>
      </p>
    </li>
  );
}
