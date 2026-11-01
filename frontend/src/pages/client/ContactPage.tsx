import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { ActiveBranch, ActiveBranchesResponse } from '../../api/types';
import { formatBranchAddress } from '../../lib/address';

const CONTACT_EMAIL = 'hola@mordi.com.ar';

export function ContactPage() {
  const [branches, setBranches] = useState<ActiveBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api<ActiveBranchesResponse>('/branches')
      .then((response) => {
        if (!cancelled) setBranches(response.branches);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar las sucursales');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Contacto</h1>
          <p className="muted">Escribinos o llamá a la sucursal que te queda cerca.</p>
        </div>
      </header>

      <div className="card legal-card">
        <h2>Mail</h2>
        <p>
          Consultas, sugerencias o problemas con un pedido:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </div>

      <section className="branch-group">
        <header className="branch-group-head">
          <h2>Sucursales</h2>
          <p>
            Teléfono y horario de cada una. <Link to="/branches">Verlas en el mapa</Link>
          </p>
        </header>

        {loading ? <p className="muted">Cargando sucursales…</p> : null}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error && branches.length === 0 ? (
          <p className="empty">Por ahora no hay sucursales abiertas.</p>
        ) : null}

        {branches.length > 0 ? (
          <ul className="branch-spot-list">
            {branches.map((branch) => (
              <li key={branch.id} className="branch-spot">
                <div className="branch-spot-top">
                  <strong>{branch.name}</strong>
                </div>
                <p className="branch-spot-address">{formatBranchAddress(branch)}</p>
                <p className="branch-spot-meta">
                  <span>{branch.openingHours}</span>
                  <a href={`tel:${branch.phone.replace(/\s/g, '')}`}>{branch.phone}</a>
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </section>
  );
}
