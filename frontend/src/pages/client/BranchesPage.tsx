import { useState } from 'react';
import { api } from '../../api/client';
import type { AvailableBranch, AvailableBranchesResponse } from '../../api/types';
import { requestDevicePosition } from '../../lib/geolocation';

function formatDistance(km: number): string {
  return `${km.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function BranchesPage() {
  const [result, setResult] = useState<AvailableBranchesResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function searchByDevice() {
    setLoading(true);
    setError('');
    try {
      const position = await requestDevicePosition();
      const params = new URLSearchParams({
        lat: String(position.latitude),
        lng: String(position.longitude),
      });
      setResult(await api<AvailableBranchesResponse>(`/branches/available?${params.toString()}`));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las sucursales');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="stack branches-page">
      <header className="page-head">
        <div>
          <h1>Sucursales</h1>
          <p className="muted">Mirá qué sucursales llegan a tu ubicación.</p>
        </div>
      </header>

      <div className="card branches-search">
        <button type="button" onClick={() => void searchByDevice()} disabled={loading}>
          {loading ? 'Buscando…' : 'Usar mi ubicación'}
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
            {result.branches.map((branch) => (
              <BranchCard key={branch.id} branch={branch} />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function BranchCard({ branch }: { branch: AvailableBranch }) {
  return (
    <li className="card branch-card">
      <div className="branch-card-title">
        <strong>{branch.name}</strong>
        <span className="branch-distance">{formatDistance(branch.distanceKm)}</span>
      </div>
      <p className="muted">{branch.address}</p>
      <p className="muted">{branch.openingHours}</p>
      <p className="muted">
        <a href={`tel:${branch.phone.replace(/\s/g, '')}`}>{branch.phone}</a>
      </p>
    </li>
  );
}
