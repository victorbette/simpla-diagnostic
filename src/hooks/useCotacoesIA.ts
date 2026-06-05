import { useState, useCallback } from 'react';
import { buscarCotacoesIA, type CotacaoAtivo } from '@/lib/cotacoesIA';

type TipoAtivo = 'acoes' | 'fiis' | 'exterior' | 'cripto';

const cache: Record<string, { cotacao: CotacaoAtivo; ts: number }> = {};
const CACHE_TTL = 10 * 60 * 1000;

export function useCotacoesIA() {
  const [cotacoes, setCotacoes] = useState<Record<string, CotacaoAtivo>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(async (tickers: Array<{ ticker: string; tipo: TipoAtivo }>) => {
    if (!tickers.length) return;
    setCarregando(true);
    setErro(null);

    const now = Date.now();
    const emCache: Record<string, CotacaoAtivo> = {};
    const paraFetch: typeof tickers = [];

    for (const t of tickers) {
      const k = t.ticker.toUpperCase();
      const entry = cache[k];
      if (entry && now - entry.ts < CACHE_TTL) {
        emCache[k] = entry.cotacao;
      } else {
        paraFetch.push(t);
      }
    }

    if (!paraFetch.length) {
      setCotacoes((prev) => ({ ...prev, ...emCache }));
      setCarregando(false);
      return;
    }

    try {
      const novas = await buscarCotacoesIA(paraFetch);
      const ts = Date.now();
      for (const [k, c] of Object.entries(novas)) {
        cache[k] = { cotacao: c, ts };
      }
      setCotacoes((prev) => ({ ...prev, ...emCache, ...novas }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao buscar cotações');
    } finally {
      setCarregando(false);
    }
  }, []);

  const limparCache = useCallback(() => {
    Object.keys(cache).forEach((k) => delete cache[k]);
    setCotacoes({});
  }, []);

  return { cotacoes, carregando, erro, buscar, limparCache };
}
