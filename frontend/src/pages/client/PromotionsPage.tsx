import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { BrandLogo } from '../../components/BrandLogo';
import { mediaUrl } from '../../lib/media';
import { formatDateTime, formatPrice } from '../../lib/money';

type ActivePromotion = {
  id: string;
  name: string;
  type: 'percent' | 'two_for_one';
  value: number;
  productName: string | null;
  productImageUrl: string | null;
  minSubtotal: number | null;
  endsAt: string | null;
};

type ActiveOffers = {
  promotions: ActivePromotion[];
  loyalty: { ordersRequired: number; minOrderAmount: number } | null;
  top3: { active: true } | null;
};

function promotionText(promotion: ActivePromotion) {
  if (promotion.type === 'two_for_one') {
    const product = promotion.productName ? ` en ${promotion.productName}` : '';
    return `Llevás dos y pagás una${product}.`;
  }
  const minimum =
    promotion.minSubtotal != null && promotion.minSubtotal > 0
      ? ` en pedidos desde ${formatPrice(promotion.minSubtotal)}`
      : '';
  return `${promotion.value}% de descuento${minimum}.`;
}

function TrophyMark() {
  return (
    <svg className="promo-spot__trophy" viewBox="0 0 64 64" aria-hidden="true">
      <path
        fill="#f59e0b"
        d="M20 12h24v10c0 8.2-5.2 14.2-12 14.2S20 30.2 20 22V12z"
      />
      <path
        fill="none"
        stroke="#ea580c"
        strokeWidth="3.2"
        strokeLinecap="round"
        d="M20 16h-6a6 6 0 0 0 0 12h6M44 16h6a6 6 0 0 1 0 12h-6"
      />
      <rect x="29" y="36" width="6" height="8" rx="2" fill="#ea580c" />
      <rect x="18" y="44" width="28" height="6" rx="3" fill="#c2410c" />
      <path fill="#fff7ed" d="M29 18.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6L29 26.7l-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" />
    </svg>
  );
}

export function PromotionsPage() {
  const [offers, setOffers] = useState<ActiveOffers | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<ActiveOffers>('/promotions/active')
      .then((next) => {
        if (!cancelled) setOffers(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar las promociones');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasCampaign = Boolean(offers?.loyalty || offers?.top3);

  return (
    <section className="stack promo-page">
      <header className="page-head">
        <div>
          <h1>Promociones</h1>
          <p className="muted">
            Lo que está vigente ahora. Si un pedido entra en más de un descuento, se aplica solo el que más te
            conviene.
          </p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="muted">Cargando…</p> : null}

      {!loading && offers ? (
        <>
          <section className="promo-panel">
            <h2>Del menú</h2>
            {offers.promotions.length === 0 ? (
              <p>No hay promociones del menú en este momento.</p>
            ) : (
              <ul className="promo-board">
                {offers.promotions.map((promotion) => {
                  const photo = promotion.productImageUrl ? mediaUrl(promotion.productImageUrl) : '';
                  return (
                    <li key={promotion.id} className="promo-spot">
                      <div className="promo-spot__art">
                        {photo ? (
                          <img src={photo} alt="" />
                        ) : (
                          <span className="promo-spot__percent">
                            {promotion.type === 'two_for_one' ? '2x1' : `${promotion.value}%`}
                          </span>
                        )}
                        {promotion.type === 'two_for_one' ? <span className="promo-badge">2x1</span> : null}
                        {promotion.type === 'percent' && photo ? (
                          <span className="promo-spot__chip">{promotion.value}%</span>
                        ) : null}
                      </div>
                      <div className="promo-spot__body">
                        <h3>{promotion.name}</h3>
                        <p>{promotionText(promotion)}</p>
                        {promotion.endsAt ? (
                          <p className="promo-spot__until">Hasta el {formatDateTime(promotion.endsAt)}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="promo-panel">
            <h2>Campañas</h2>
            {hasCampaign ? (
              <ul className="promo-board">
                {offers.loyalty ? (
                  <li className="promo-spot">
                    <div className="promo-spot__mark promo-spot__mark--stamp">
                      <BrandLogo size={52} className="promo-spot__logo" alt="" />
                    </div>
                    <div className="promo-spot__body">
                      <h3>Sellos</h3>
                      <p>
                        Cada {offers.loyalty.ordersRequired} pedidos desde{' '}
                        {formatPrice(offers.loyalty.minOrderAmount)} suma un sello. Al completarlos, el premio de ese
                        pedido es una sorpresa. Si cancelás el pedido, el sello se revierte.
                      </p>
                    </div>
                  </li>
                ) : null}
                {offers.top3 ? (
                  <li className="promo-spot">
                    <div className="promo-spot__mark promo-spot__mark--trophy">
                      <TrophyMark />
                    </div>
                    <div className="promo-spot__body">
                      <h3>Top 3 compradores</h3>
                      <p>
                        Estamos sumando el gasto de los pedidos. Al cerrar la campaña, los 3 clientes que más gastaron
                        se llevan un premio sorpresa de un solo uso.
                      </p>
                    </div>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p>No hay campañas activas en este momento.</p>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
