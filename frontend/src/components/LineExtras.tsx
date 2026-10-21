import { mediaUrl } from '../lib/media';
import { formatPrice } from '../lib/money';

type LineExtra = {
  id?: string;
  name: string;
  price?: number;
  imageUrl?: string | null;
};

export function LineExtras({
  extras,
  className,
  onRemove,
  busy,
}: {
  extras: LineExtra[];
  className?: string;
  onRemove?: (extra: LineExtra) => void;
  busy?: boolean;
}) {
  if (extras.length === 0) return null;

  return (
    <div className={className ? `line-extras ${className}` : 'line-extras'}>
      {extras.map((extra, index) => (
        <div key={extra.id ?? `${extra.name}-${index}`} className="line-extra">
          <span className="line-extra-mark" aria-hidden="true">
            └
          </span>
          {extra.imageUrl ? (
            <img
              src={mediaUrl(extra.imageUrl)}
              alt=""
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <span className="line-extra-fallback" aria-hidden="true">
              ✨
            </span>
          )}
          <span className="line-extra-name">{extra.name}</span>
          {extra.price ? <span className="line-extra-price">(+{formatPrice(extra.price)})</span> : null}
          {onRemove && extra.id ? (
            <button
              type="button"
              className="line-extra-remove"
              disabled={busy}
              aria-label={`Quitar ${extra.name}`}
              onClick={() => onRemove(extra)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 7h16" strokeLinecap="round" />
                <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
