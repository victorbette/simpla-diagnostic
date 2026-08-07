import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

function horaAtualBRT(): { hora: number; minuto: number } {
  const now = new Date();
  // BRT = UTC-3
  const brtOffset = -3 * 60;
  const localOffset = now.getTimezoneOffset();
  const diffMs = (brtOffset - -localOffset) * 60 * 1000;
  const brt = new Date(now.getTime() + diffMs);
  return { hora: brt.getHours(), minuto: brt.getMinutes() };
}

function msAtePróximoAgendado(): number {
  const now = new Date();
  const brtOffset = -3 * 60;
  const localOffset = now.getTimezoneOffset();
  const diffMs = (brtOffset - -localOffset) * 60 * 1000;
  const brt = new Date(now.getTime() + diffMs);

  const horasBRT = [6, 18];
  const minutosAte: number[] = horasBRT.map((h) => {
    let delta = (h * 60 - (brt.getHours() * 60 + brt.getMinutes())) * 60 * 1000 - brt.getSeconds() * 1000;
    if (delta <= 0) delta += 24 * 60 * 60 * 1000;
    return delta;
  });
  return Math.min(...minutosAte);
}

export function useAutoUpdate() {
  const [recarregando, setRecarregando] = useState(false);
  const [dispensado, setDispensado] = useState(false);
  const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      if (!r) return;
      // Poll every 30 minutes for SW updates
      setInterval(() => r.update(), 30 * 60 * 1000);
    },
  });

  const aplicarUpdate = () => {
    setRecarregando(true);
    updateServiceWorker(true);
  };

  const dispensar = () => setDispensado(true);

  // Schedule forced reload at 6h and 18h BRT
  useEffect(() => {
    function agendarProximoReload() {
      const ms = msAtePróximoAgendado();
      scheduledRef.current = setTimeout(() => {
        const { hora } = horaAtualBRT();
        if (hora === 6 || hora === 18) {
          window.location.reload();
        } else {
          agendarProximoReload();
        }
      }, ms);
    }
    agendarProximoReload();
    return () => {
      if (scheduledRef.current) clearTimeout(scheduledRef.current);
    };
  }, []);

  const temUpdate = needRefresh && !dispensado;

  return { temUpdate, recarregando, aplicarUpdate, dispensar };
}
