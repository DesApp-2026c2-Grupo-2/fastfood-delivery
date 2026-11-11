import { useEffect, useState } from 'react';
import type { Product } from '../api/types';
import { mediaUrl } from '../lib/media';

export function NeedMealModal({ onMenu, onClose }: { onMenu: () => void; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="card modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="need-meal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="need-meal-title">Primero agregá el pedido</h2>
        <p>Para sumar aderezos, primero agregá las hamburguesas y las guarniciones.</p>
        <div className="row modal-actions">
          <button type="button" onClick={onMenu}>
            Ir al menú
          </button>
          <button type="button" className="secondary" autoFocus onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export function SaucePickerModal({
  sauces,
  maxPerSauce,
  busy,
  error,
  onConfirm,
  onSkip,
  onClose,
}: {
  sauces: Product[];
  maxPerSauce: number;
  busy: boolean;
  error: string;
  onConfirm: (quantities: Record<string, number>) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(sauces.map((sauce) => [sauce.id, Math.floor(maxPerSauce / 2)])),
  );
  const selected = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  const limitLabel = maxPerSauce === 1 ? '1' : String(maxPerSauce);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  function change(id: string, delta: number) {
    setQuantities((current) => {
      const nextQty = Math.min(maxPerSauce, Math.max(0, (current[id] ?? 0) + delta));
      return { ...current, [id]: nextQty };
    });
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="card modal sauce-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sauce-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="sauce-picker-title">¿Sumamos aderezos?</h2>
        <p>
          Podés agregar hasta {limitLabel} de cada aderezo: 2 por hamburguesa y 2 por cada guarnición.
        </p>
        {sauces.length === 0 ? (
          <p>Ahora no hay aderezos disponibles.</p>
        ) : (
          <ul className="sauce-picker-list">
            {sauces.map((sauce) => {
              const qty = quantities[sauce.id] ?? 0;
              const image = sauce.images?.[0]?.url || sauce.imageUrl;
              return (
                <li key={sauce.id} className="sauce-picker-row">
                  {image ? (
                    <img
                      src={mediaUrl(image)}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="sauce-picker-fallback" aria-hidden="true" />
                  )}
                  <span className="sauce-picker-name">{sauce.name}</span>
                  <div className="cart-qty">
                    <button
                      type="button"
                      disabled={busy || qty === 0}
                      onClick={() => change(sauce.id, -1)}
                      aria-label={`Menos ${sauce.name}`}
                    >
                      −
                    </button>
                    <span>{qty}</span>
                    <button
                      type="button"
                      disabled={busy || qty >= maxPerSauce}
                      onClick={() => change(sauce.id, 1)}
                      aria-label={`Más ${sauce.name}`}
                    >
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="sauce-picker-count">Hasta {limitLabel} de cada uno</p>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="row modal-actions">
          <button type="button" disabled={busy || selected === 0} onClick={() => onConfirm(quantities)}>
            {busy ? 'Agregando…' : 'Agregar y continuar'}
          </button>
          <button type="button" className="secondary" disabled={busy} onClick={onSkip}>
            Continuar sin aderezos
          </button>
        </div>
      </div>
    </div>
  );
}
