import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { LoyaltyCampaign, Top3Campaign } from '../../api/types';
import { getToken } from '../../auth/session';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useSuccessNotice, useTimedNotice } from '../../lib/success-notice';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

function parseBounded(raw: string, integer: boolean, min: number, max: number): number | null {
  const text = raw.trim().replace(',', '.');
  if (!text || Number.isNaN(Number(text))) return null;
  const value = Number(text);
  if (integer && !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

export function AdminCampaignsPage() {
  const token = getToken() ?? '';
  const [campaign, setCampaign] = useState<Top3Campaign | null>(null);
  const [top3Editing, setTop3Editing] = useState(false);
  const [top3Draft, setTop3Draft] = useState('');
  const [loyalty, setLoyalty] = useState<LoyaltyCampaign | null>(null);
  const [loyaltyEditing, setLoyaltyEditing] = useState(false);
  const [loyaltyDraft, setLoyaltyDraft] = useState({ ordersRequired: '', minOrderAmount: '', discountPercent: '' });
  const [pendingFinishLoyalty, setPendingFinishLoyalty] = useState(false);
  const [pendingAward, setPendingAward] = useState(false);
  const [error, setError] = useTimedNotice();
  const [ok, setOk] = useSuccessNotice();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function fillLoyaltyDraft(status: LoyaltyCampaign) {
    setLoyaltyDraft({
      ordersRequired: String(status.ordersRequired),
      minOrderAmount: String(status.minOrderAmount),
      discountPercent: String(status.discountPercent),
    });
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [campaignStatus, loyaltyStatus] = await Promise.all([
        api<Top3Campaign>('/admin/promotions/top3-campaign', { token }),
        api<LoyaltyCampaign>('/admin/promotions/loyalty-campaign', { token }),
      ]);
      setCampaign(campaignStatus);
      setTop3Draft(String(campaignStatus.discountPercent));
      setLoyalty(loyaltyStatus);
      fillLoyaltyDraft(loyaltyStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las campañas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startLoyalty() {
    setBusy(true);
    setError('');
    setOk('');
    try {
      const status = await api<LoyaltyCampaign>('/admin/promotions/loyalty-campaign/start', { method: 'POST', token });
      setLoyalty(status);
      fillLoyaltyDraft(status);
      setOk('Campaña de sellos iniciada. Los pedidos que superen el mínimo vuelven a sumar un sello.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la campaña de sellos');
    } finally {
      setBusy(false);
    }
  }

  async function finishLoyalty() {
    setBusy(true);
    setError('');
    setOk('');
    try {
      const status = await api<LoyaltyCampaign>('/admin/promotions/loyalty-campaign/finish', { method: 'POST', token });
      setPendingFinishLoyalty(false);
      setLoyalty(status);
      fillLoyaltyDraft(status);
      setOk('Campaña de sellos finalizada. Los sellos que ya tenían se conservan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo finalizar la campaña de sellos');
    } finally {
      setBusy(false);
    }
  }

  async function saveLoyalty(event: FormEvent) {
    event.preventDefault();
    if (!loyalty) return;
    const ordersRequired = parseBounded(
      loyaltyDraft.ordersRequired,
      true,
      loyalty.limits.ordersRequired.min,
      loyalty.limits.ordersRequired.max,
    );
    const minOrderAmount = parseBounded(
      loyaltyDraft.minOrderAmount,
      false,
      loyalty.limits.minOrderAmount.min,
      loyalty.limits.minOrderAmount.max,
    );
    const discountPercent = parseBounded(
      loyaltyDraft.discountPercent,
      true,
      loyalty.limits.discountPercent.min,
      loyalty.limits.discountPercent.max,
    );
    if (ordersRequired == null || minOrderAmount == null || discountPercent == null) {
      setOk('');
      setError('Revisá la cantidad de pedidos, el monto mínimo y el descuento. Tienen que estar dentro de los límites.');
      return;
    }
    setBusy(true);
    setError('');
    setOk('');
    try {
      const status = await api<LoyaltyCampaign>('/admin/promotions/loyalty-campaign', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ ordersRequired, minOrderAmount, discountPercent }),
      });
      setLoyalty(status);
      fillLoyaltyDraft(status);
      setLoyaltyEditing(false);
      setOk('Campaña de sellos actualizada. Rige desde el próximo pedido.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la campaña de sellos');
    } finally {
      setBusy(false);
    }
  }

  async function saveTop3(event: FormEvent) {
    event.preventDefault();
    if (!campaign) return;
    const discountPercent = parseBounded(
      top3Draft,
      true,
      campaign.limits.discountPercent.min,
      campaign.limits.discountPercent.max,
    );
    if (discountPercent == null) {
      setOk('');
      setError(
        `El descuento tiene que ser un entero entre ${campaign.limits.discountPercent.min} y ${campaign.limits.discountPercent.max}.`,
      );
      return;
    }
    setBusy(true);
    setError('');
    setOk('');
    try {
      const status = await api<Top3Campaign>('/admin/promotions/top3-campaign', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ discountPercent }),
      });
      setCampaign(status);
      setTop3Draft(String(status.discountPercent));
      setTop3Editing(false);
      setOk('Descuento de Top 3 actualizado. Rige desde el próximo premio.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el descuento de Top 3');
    } finally {
      setBusy(false);
    }
  }

  async function refreshCampaign() {
    setBusy(true);
    setError('');
    try {
      setCampaign(await api<Top3Campaign>('/admin/promotions/top3-campaign', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el ranking');
    } finally {
      setBusy(false);
    }
  }

  async function startCampaign() {
    setBusy(true);
    setError('');
    setOk('');
    try {
      setCampaign(await api<Top3Campaign>('/admin/promotions/top3-campaign/start', { method: 'POST', token }));
      setOk('Campaña Top 3 iniciada. El ranking suma pedidos desde ahora; si se cancelan, se descuentan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la campaña');
    } finally {
      setBusy(false);
    }
  }

  async function awardCampaign() {
    setBusy(true);
    setError('');
    setOk('');
    try {
      const result = await api<{ message: string; awardedUsers: { name: string }[] }>(
        '/admin/promotions/top3-campaign/award',
        { method: 'POST', token },
      );
      setPendingAward(false);
      setOk(result.message);
      setCampaign(await api<Top3Campaign>('/admin/promotions/top3-campaign', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la campaña');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Campañas</h1>
          <p className="muted">
            Programas para los clientes: sellos y Top 3. No se suman entre sí ni con una promoción del menú: en cada
            pedido se aplica solo el descuento que más conviene.
          </p>
        </div>
      </header>

      {error && !pendingAward && !pendingFinishLoyalty ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="success" role="status">
          {ok}
        </p>
      ) : null}
      {loading ? <p className="muted">Cargando…</p> : null}

      {!loading && loyalty ? (
        <article className="card order-detail-card top3-campaign">
          <div className="top3-campaign-head">
            <div>
              <h2>Sellos</h2>
              <p className="muted">
                Cada {loyalty.ordersRequired} pedidos desde {formatMoney(loyalty.minOrderAmount)} suma un sello. Al
                completarlos, ese pedido tiene {loyalty.discountPercent}% OFF. Si se cancela, el sello se revierte.
              </p>
            </div>
            <span className={loyalty.active ? 'badge' : 'badge badge--off'}>
              {loyalty.active ? 'activa' : 'inactiva'}
            </span>
          </div>
          <p className="muted">
            {loyalty.active
              ? 'Los pedidos que llegan al mínimo suman un sello.'
              : 'Finalizada: no suma sellos ni aplica el premio. Los sellos que ya tienen se conservan.'}
          </p>
          {loyaltyEditing ? (
            <form className="form" onSubmit={saveLoyalty} noValidate>
              <label>
                Cantidad de pedidos para el premio
                <input
                  value={loyaltyDraft.ordersRequired}
                  onChange={(event) => setLoyaltyDraft((current) => ({ ...current, ordersRequired: event.target.value }))}
                  inputMode="numeric"
                />
                <p className="field-hint">
                  Entre {loyalty.limits.ordersRequired.min} y {loyalty.limits.ordersRequired.max}, sin decimales.
                </p>
              </label>
              <label>
                Costo mínimo para el sello
                <input
                  value={loyaltyDraft.minOrderAmount}
                  onChange={(event) => setLoyaltyDraft((current) => ({ ...current, minOrderAmount: event.target.value }))}
                  inputMode="decimal"
                />
                <p className="field-hint">
                  Subtotal del pedido, sin envío. Entre {formatMoney(loyalty.limits.minOrderAmount.min)} y{' '}
                  {formatMoney(loyalty.limits.minOrderAmount.max)}.
                </p>
              </label>
              <label>
                Descuento al completar los sellos
                <input
                  value={loyaltyDraft.discountPercent}
                  onChange={(event) => setLoyaltyDraft((current) => ({ ...current, discountPercent: event.target.value }))}
                  inputMode="numeric"
                />
                <p className="field-hint">
                  Porcentaje del pedido que completa la tarjeta. Entre {loyalty.limits.discountPercent.min} y{' '}
                  {loyalty.limits.discountPercent.max}.
                </p>
              </label>
              <div className="row">
                <button type="submit" disabled={busy}>
                  {busy ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    fillLoyaltyDraft(loyalty);
                    setLoyaltyEditing(false);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="row">
              {loyalty.active ? (
                <button type="button" disabled={busy} onClick={() => setPendingFinishLoyalty(true)}>
                  Finalizar
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={() => void startLoyalty()}>
                  {busy ? 'Iniciando…' : 'Iniciar'}
                </button>
              )}
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => {
                  fillLoyaltyDraft(loyalty);
                  setLoyaltyEditing(true);
                }}
              >
                Editar
              </button>
            </div>
          )}
          {(loyalty.holders ?? []).length === 0 ? (
            <p className="muted">Ningún cliente tiene sellos.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Email</th>
                    <th className="data-table-price">Sellos</th>
                  </tr>
                </thead>
                <tbody>
                  {(loyalty.holders ?? []).map((holder, index) => (
                    <tr key={holder.userId}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{holder.name}</strong>
                      </td>
                      <td>{holder.email}</td>
                      <td className="data-table-price">{holder.stamps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      ) : null}

      {!loading && campaign ? (
        <article className="card order-detail-card top3-campaign">
          <div className="top3-campaign-head">
            <div>
              <h2>Top 3 compradores</h2>
              <p className="muted">
                Premia a los 3 clientes con más gasto desde que se inicia. Los pedidos cuentan al confirmarse y se
                descuentan si se cancelan. El premio es {campaign.discountPercent}% OFF de un solo uso.
              </p>
            </div>
            <span className={campaign.active ? 'badge' : 'badge badge--off'}>
              {campaign.active ? 'activa' : 'inactiva'}
            </span>
          </div>
          {campaign.active && campaign.startedAt ? (
            <p>
              Inició el{' '}
              {new Date(campaign.startedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}.
            </p>
          ) : (
            <p className="muted">No hay campaña en curso. Al iniciarla, el ranking empieza de cero.</p>
          )}
          {top3Editing ? (
            <form className="form" onSubmit={saveTop3} noValidate>
              <label>
                Descuento del premio
                <input value={top3Draft} onChange={(event) => setTop3Draft(event.target.value)} inputMode="numeric" />
                <p className="field-hint">
                  Porcentaje de un solo uso para los 3 primeros. Entre {campaign.limits.discountPercent.min} y{' '}
                  {campaign.limits.discountPercent.max}.
                </p>
              </label>
              <div className="row">
                <button type="submit" disabled={busy}>
                  {busy ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    setTop3Draft(String(campaign.discountPercent));
                    setTop3Editing(false);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="row">
              {campaign.active ? (
                <>
                  <button type="button" className="secondary" disabled={busy} onClick={() => void refreshCampaign()}>
                    Actualizar ranking
                  </button>
                  <button type="button" disabled={busy} onClick={() => setPendingAward(true)}>
                    Cerrar y premiar
                  </button>
                </>
              ) : (
                <button type="button" disabled={busy} onClick={() => void startCampaign()}>
                  {busy ? 'Iniciando…' : 'Iniciar'}
                </button>
              )}
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setTop3Draft(String(campaign.discountPercent));
                  setTop3Editing(true);
                }}
              >
                Editar
              </button>
            </div>
          )}
          {campaign.active ? (
            campaign.ranking.length === 0 ? (
              <p className="muted">Todavía no hay pedidos desde el inicio de la campaña.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Cliente</th>
                      <th>Email</th>
                      <th className="data-table-price">Gastado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.ranking.map((entry, index) => (
                      <tr key={entry.userId} className={index < 3 ? 'top3-podium-row' : undefined}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{entry.name}</strong>
                          {index < 3 ? <span className="badge">podio</span> : null}
                        </td>
                        <td>{entry.email}</td>
                        <td className="data-table-price">{formatMoney(entry.totalSpent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
        </article>
      ) : null}

      {pendingFinishLoyalty && loyalty ? (
        <ConfirmModal
          title="Finalizar campaña de sellos"
          message="Los clientes dejan de sumar sellos y el premio no se aplica. Los sellos que ya tienen se conservan. ¿Continuar?"
          confirmLabel="Finalizar"
          busyLabel="Finalizando…"
          busy={busy}
          error={error}
          onConfirm={() => void finishLoyalty()}
          onClose={() => {
            if (!busy) setPendingFinishLoyalty(false);
          }}
        />
      ) : null}

      {pendingAward && campaign ? (
        <ConfirmModal
          title="Cerrar campaña Top 3"
          message={`Se va a premiar a los 3 primeros del ranking con ${campaign.discountPercent}% OFF de un solo uso, se limpian premios viejos sin usar y la campaña queda inactiva. ¿Continuar?`}
          confirmLabel="Premiar y cerrar"
          busyLabel="Premiando…"
          busy={busy}
          danger={false}
          error={error}
          onConfirm={() => void awardCampaign()}
          onClose={() => {
            if (!busy) setPendingAward(false);
          }}
        />
      ) : null}
    </section>
  );
}
