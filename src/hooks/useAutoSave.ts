import { useRef, useCallback } from 'react';

export function useAutoSave(salvar: () => Promise<void>, delayMs = 800) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salvandoRef = useRef(false);

  const salvarComDebounce = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (salvandoRef.current) return;
      salvandoRef.current = true;
      try { await salvar(); }
      finally { salvandoRef.current = false; }
    }, delayMs);
  }, [salvar, delayMs]);

  const salvarImediato = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (salvandoRef.current) return;
    salvandoRef.current = true;
    try { await salvar(); }
    finally { salvandoRef.current = false; }
  }, [salvar]);

  return { salvarComDebounce, salvarImediato };
}
