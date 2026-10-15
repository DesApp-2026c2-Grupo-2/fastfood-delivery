import { useCallback, useEffect, useRef, useState } from 'react';

/** DEV-18: un aviso de éxito se va solo. Los de error no pasan por acá. */
export const SUCCESS_NOTICE_MS = 4_000;

export function useSuccessNotice() {
  const [message, setMessage] = useState('');
  const timer = useRef<number | undefined>(undefined);

  const setNotice = useCallback((next: string) => {
    window.clearTimeout(timer.current);
    setMessage(next);
    if (!next) return;
    timer.current = window.setTimeout(() => setMessage(''), SUCCESS_NOTICE_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return [message, setNotice] as const;
}
