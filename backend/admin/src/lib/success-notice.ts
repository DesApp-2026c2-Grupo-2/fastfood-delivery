import { useCallback, useEffect, useRef, useState } from 'react';

/** Un aviso de éxito o de error se va solo a los 4 segundos. */
export const SUCCESS_NOTICE_MS = 4_000;

export function useTimedNotice() {
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

export const useSuccessNotice = useTimedNotice;
