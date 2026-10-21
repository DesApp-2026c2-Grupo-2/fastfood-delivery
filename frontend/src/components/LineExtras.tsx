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
              Quitar
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
