import type { LoyaltyProgress } from '../api/types';
import { formatPrice } from '../lib/money';
import { BrandLogo } from './BrandLogo';

type LoyaltyStampsCardProps = {
  loyalty: Pick<
    LoyaltyProgress,
    'progress' | 'ordersRequired' | 'minOrderAmount' | 'qualifiesThisOrder' | 'rewardOnThisOrder'
  >;
  /** En perfil no hay “este pedido”; en confirmación sí. */
  context?: 'checkout' | 'profile';
};

export function LoyaltyStampsCard({ loyalty, context = 'checkout' }: LoyaltyStampsCardProps) {
  const { progress, ordersRequired, minOrderAmount, qualifiesThisOrder, rewardOnThisOrder } = loyalty;

  let message: string;
  if (context === 'profile') {
    message =
      progress === 0
        ? `Sumá compras de ${formatPrice(minOrderAmount)} o más para ir llenando tus estampas. Si cancelás, la estampa se revierte.`
        : '¡Estás más cerca de tu premio! Seguí comprando para desbloquearlo.';
  } else if (rewardOnThisOrder) {
    message = '¡Desbloqueaste tu premio en este pedido!';
  } else if (qualifiesThisOrder) {
    message = '¡Estás más cerca de tu premio! Seguí comprando para desbloquearlo.';
  } else {
    message = `Esta compra no suma estampa (mínimo ${formatPrice(minOrderAmount)}). Seguí comprando para acercarte a tu premio.`;
  }

  return (
    <div className="loyalty-stamps" role="status" aria-label={message}>
      <div className="loyalty-stamps__head">
        <span className="loyalty-stamps__label">Tus estampas</span>
        <strong className="loyalty-stamps__count">
          {progress}/{ordersRequired}
        </strong>
      </div>
      <ul className="loyalty-stamps__grid">
        {Array.from({ length: ordersRequired }, (_, index) => {
          const filled = index < progress;
          return (
            <li
              key={index}
              className={filled ? 'loyalty-stamp loyalty-stamp--filled' : 'loyalty-stamp'}
              aria-label={filled ? `Estampa ${index + 1} conseguida` : `Estampa ${index + 1} pendiente`}
            >
              <BrandLogo size={28} className="loyalty-stamp__logo" alt="" />
            </li>
          );
        })}
      </ul>
      <p className="loyalty-stamps__msg">{message}</p>
    </div>
  );
}
