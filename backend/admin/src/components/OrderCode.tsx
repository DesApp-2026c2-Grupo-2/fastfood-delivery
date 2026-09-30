import { useState } from 'react';
import { Link } from 'react-router-dom';

type OrderCodeProps = {
  id: string;
  to?: string;
  state?: unknown;
  /** En el detalle el id se parte en varias líneas. En el listado se corta con puntos. */
  wrap?: boolean;
};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

export function OrderCode({ id, to, state, wrap = false }: OrderCodeProps) {
  const [copied, setCopied] = useState(false);
  const label = `#${id}`;

  async function copy(event: { preventDefault(): void; stopPropagation(): void }) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await copyText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const className = `order-code-value${wrap ? ' order-code-value--wrap' : ''}`;

  return (
    <span className="order-code">
      {to ? (
        <Link className={className} to={to} state={state} title={id}>
          {label}
        </Link>
      ) : (
        <span className={className} title={id}>
          {label}
        </span>
      )}
      <button type="button" className="order-code-copy" onClick={(event) => void copy(event)}>
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </span>
  );
}
