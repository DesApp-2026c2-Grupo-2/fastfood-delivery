import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { ORDER_STATUS_LABEL, type OrderStatus, type OrderStatusInfo, type SystemParameter } from '../../api/types';
import { getToken } from '../../auth/session';

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 4 }).format(value);
}

function parseParameter(raw: string, parameter: SystemParameter): number | null {
  const text = raw.trim().replace(',', '.');
  if (!text || Number.isNaN(Number(text))) return null;
  const value = Number(text);
  if (parameter.integer && !Number.isInteger(value)) return null;
  if (value < parameter.min || value > parameter.max) return null;
  return value;
}

export function AdminParametersPage() {
  const token = getToken() ?? '';
  const [parameters, setParameters] = useState<SystemParameter[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<OrderStatusInfo[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [parameterList, statusList] = await Promise.all([
          api<SystemParameter[]>('/admin/parameters', { token }),
          api<OrderStatusInfo[]>('/admin/order-statuses', { token }),
        ]);
        if (cancelled) return;
        setParameters(parameterList);
        setDrafts(Object.fromEntries(parameterList.map((item) => [item.key, String(item.value)])));
        setStatuses(statusList);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar los parámetros');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const changes: Record<string, number> = {};
    for (const parameter of parameters) {
      const raw = drafts[parameter.key] ?? '';
      const value = parseParameter(raw, parameter);
      if (value == null) {
        const kind = parameter.integer ? 'un entero' : 'un número';
        setOk('');
        setError(
          `${parameter.label} tiene que ser ${kind} entre ${formatNumber(parameter.min)} y ${formatNumber(parameter.max)}.`,
        );
        return;
      }
      if (value !== parameter.value) changes[parameter.key] = value;
    }

    if (Object.keys(changes).length === 0) {
      setError('');
      setOk('No hay cambios para guardar.');
      return;
    }

    setSaving(true);
    setError('');
    setOk('');
    try {
      const updated = await api<SystemParameter[]>('/admin/parameters', {
        method: 'PATCH',
        token,
        body: JSON.stringify(changes),
      });
      setParameters(updated);
      setDrafts(Object.fromEntries(updated.map((item) => [item.key, String(item.value)])));
      setOk('Parámetros guardados. Rigen desde el próximo pedido.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los parámetros');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Parámetros</h1>
          <p className="muted">Radio de cobertura y constantes de la hora estimada. No recalculan pedidos ya confirmados.</p>
        </div>
      </header>

      {loading ? <p className="muted">Cargando parámetros…</p> : null}

      {!loading && parameters.length > 0 ? (
        <form className="form" onSubmit={onSubmit}>
          {parameters.map((parameter) => (
            <label key={parameter.key}>
              {parameter.label}
              <span className="param-input">
                <input
                  value={drafts[parameter.key] ?? ''}
                  onChange={(event) => {
                    setDrafts((current) => ({ ...current, [parameter.key]: event.target.value }));
                    setOk('');
                  }}
                  inputMode={parameter.integer ? 'numeric' : 'decimal'}
                  aria-describedby={`${parameter.key}-hint`}
                />
                <span className="param-unit">{parameter.unit}</span>
              </span>
              <p className="field-hint" id={`${parameter.key}-hint`}>
                {parameter.description} Entre {formatNumber(parameter.min)} y {formatNumber(parameter.max)}
                {parameter.integer ? ', sin decimales' : ''}.
              </p>
            </label>
          ))}
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p className="success" role="status">
              {ok}
            </p>
          ) : null}
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar parámetros'}
          </button>
        </form>
      ) : null}

      {!loading && statuses.length > 0 ? (
        <article className="card order-detail-card">
          <h2>Estados del pedido</h2>
          <p className="muted">Consulta. El ciclo de estados no se edita desde acá.</p>
          <ol className="status-catalog">
            {statuses.map((item) => (
              <li key={item.status}>
                <span className={`badge badge-status badge-status--${item.status}`}>
                  {item.label || ORDER_STATUS_LABEL[item.status as OrderStatus]}
                </span>
                <p>{item.description}</p>
                {item.next.length > 0 ? (
                  <p className="muted">
                    Siguiente:{' '}
                    {item.next.map((status) => ORDER_STATUS_LABEL[status] ?? status).join(' o ')}
                  </p>
                ) : (
                  <p className="muted">Estado final.</p>
                )}
              </li>
            ))}
          </ol>
        </article>
      ) : null}
    </section>
  );
}
