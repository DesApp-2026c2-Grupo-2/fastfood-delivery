import { useEffect, useRef } from 'react';

export function useAutoClear(value: string, onClear: () => void, ms = 4000) {
  const clearRef = useRef(onClear);
  clearRef.current = onClear;

  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(() => clearRef.current(), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
}