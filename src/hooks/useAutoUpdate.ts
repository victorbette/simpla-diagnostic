import { useCallback, useEffect, useRef, useState } from "react";
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

export function useAutoUpdate(onAntesDeAtualizar?: () => Promise<void>) {
  const [recarregando, setRecarregando] = useState(false);
  const [salvandoAntes, setSalvandoAntes] = useState(false);
  const [dispensado, setDispensado] = useState(false);
  const [versaoMudou, setVersaoMudou] = useState(false);
  const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always-current ref — avoids stale closure in scheduled reload
  const onAntesRef = useRef(onAntesDeAtualizar);
  onAntesRef.current = onAntesDeAtualizar;

  // Version loaded when the app started
  const versaoAtualRef = useRef<string | null>(null);

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

  const aplicarUpdate = useCallback(async () => {
    setSalvandoAntes(true);
    try {
      if (onAntesRef.current) await onAntesRef.current();
    } catch (err) {
      console.error('Erro ao salvar antes de atualizar:', err);
    } finally {
      setSalvandoAntes(false);
      setRecarregando(true);
      if (needRefresh) {
        updateServiceWorker(true);
      } else {
        window.location.reload();
      }
    }
  }, [needRefresh, updateServiceWorker]);

  const dispensar = () => setDispensado(true);

  // Fetch version at startup to record the baseline
  useEffect(() => {
    const buscarVersaoAtual = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json() as { version: string };
        versaoAtualRef.current = data.version;
      } catch {
        // silencioso
      }
    };
    void buscarVersaoAtual();
  }, []);

  // Poll version.json every 2 minutes — triggers banner when deploy changes
  useEffect(() => {
    const verificarVersao = async () => {
      if (!versaoAtualRef.current) return;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json() as { version: string };
        if (data.version !== versaoAtualRef.current) {
          setVersaoMudou(true);
        }
      } catch {
        // silencioso — sem internet, ignorar
      }
    };

    void verificarVersao();
    const intervalo = setInterval(verificarVersao, 2 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, []);

  // Schedule forced reload at 6h and 18h BRT
  useEffect(() => {
    async function fazerReload() {
      if (onAntesRef.current) {
        try { await onAntesRef.current(); } catch { /**/ }
      }
      window.location.reload();
    }

    function agendarProximoReload() {
      const ms = msAtePróximoAgendado();
      scheduledRef.current = setTimeout(() => {
        const { hora } = horaAtualBRT();
        if (hora === 6 || hora === 18) {
          void fazerReload();
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

  const temUpdate = (needRefresh || versaoMudou) && !dispensado;

  return { temUpdate, recarregando, salvandoAntes, aplicarUpdate, dispensar };
}
