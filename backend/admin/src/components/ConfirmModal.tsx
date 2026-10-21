import { useEffect } from 'react';

type ConfirmModalProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  busyLabel = 'Un momento…',
  busy = false,
  error = '',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="card modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-modal-title">{title}</h2>
        <p>{message}</p>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="row modal-actions">
          <button type="button" className="danger" disabled={busy} onClick={onConfirm}>
            {busy ? busyLabel : confirmLabel}
          </button>
          <button type="button" className="secondary" disabled={busy} autoFocus onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
