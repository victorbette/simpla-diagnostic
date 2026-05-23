import { useState, useCallback, useRef } from "react";

export interface Cotacao {
  ticker: string;
  tipo: string;
  preco: number;
  moeda: string;
  nome: string;
  variacaoPct: number;
  atualizadoEm: string;
  erro?: string;
}

export interface TickerRequest {
  ticker: string;
  tipo: "acoes" | "fiis" | "exterior" | "cripto";
}

const EDGE_URL = "https://gimcyirqinmlwbakcnhq.supabase.co/functions/v1/cotacoes";

// Module-level cache: ticker → { cotacao, timestamp }
const cache: Record<string, { cotacao: Cotacao; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function useCotacoes() {
  const [cotacoes, setCotacoes] = useState<Record<string, Cotacao>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const buscarCotacoes = useCallback(async (tickers: TickerRequest[]) => {
    if (tickers.length === 0) return;

    const agora = Date.now();
    const cached: Record<string, Cotacao> = {};
    const precisaBuscar: TickerRequest[] = [];

    for (const t of tickers) {
      const key = t.ticker.toUpperCase();
      const hit = cache[key];
      if (hit && agora - hit.ts < CACHE_TTL) {
        cached[key] = hit.cotacao;
      } else {
        precisaBuscar.push(t);
      }
    }

    if (Object.keys(cached).length > 0) {
      setCotacoes((prev) => ({ ...prev, ...cached }));
    }

    if (precisaBuscar.length === 0) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setCarregando(true);
    setErro(null);

    try {
      const resp = await fetch(EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: precisaBuscar }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        const texto = await resp.text();
        throw new Error(`Erro ${resp.status}: ${texto}`);
      }

      const data = await resp.json();
      const novas: Record<string, Cotacao> = data?.cotacoes ?? {};

      for (const [key, cot] of Object.entries(novas)) {
        cache[key] = { cotacao: cot as Cotacao, ts: Date.now() };
      }

      setCotacoes((prev) => ({ ...prev, ...novas }));
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("[useCotacoes] erro completo:", {
          message: err.message,
          err,
        });
        setErro(err.message ?? "Erro desconhecido");
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  const limparCache = useCallback(() => {
    Object.keys(cache).forEach((k) => delete cache[k]);
  }, []);

  return { cotacoes, carregando, erro, buscarCotacoes, limparCache };
}
