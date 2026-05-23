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

// Cache em memória — 5 minutos
const cache: Record<string, { cotacao: Cotacao; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000;

// ── BRAPI — Ações BR e FIIs ──────────────────────────────────
async function buscarBrapi(
  tickers: TickerRequest[]
): Promise<Record<string, Cotacao>> {
  const resultado: Record<string, Cotacao> = {};
  if (tickers.length === 0) return resultado;

  const LOTE = 5;
  const lotes: TickerRequest[][] = [];
  for (let i = 0; i < tickers.length; i += LOTE) {
    lotes.push(tickers.slice(i, i + LOTE));
  }

  for (let li = 0; li < lotes.length; li++) {
    const lote = lotes[li];
    const simbolos = lote.map((t) => t.ticker.toUpperCase()).join(",");
    console.log("[Brapi] buscando lote:", simbolos);

    try {
      const url = `https://brapi.dev/api/quote/${simbolos}?token=demo&fundamental=false`;
      const resp = await fetch(url, { headers: { Accept: "application/json" } });

      if (!resp.ok) {
        console.warn("[Brapi] erro lote", simbolos, resp.status);
      } else {
        const data = await resp.json();
        const quotes: Record<string, unknown>[] = data?.results ?? [];
        console.log("[Brapi] retornou:", quotes.map((q) => q.symbol));

        for (const quote of quotes) {
          const raw = (quote.symbol as string) ?? "";
          const ticker = raw.replace(".SA", "").toUpperCase();
          const tipo = lote.find((t) => t.ticker.toUpperCase() === ticker)?.tipo ?? "acoes";

          resultado[ticker] = {
            ticker,
            tipo,
            preco: (quote.regularMarketPrice as number) ?? 0,
            moeda: "BRL",
            nome: (quote.shortName as string) ?? (quote.longName as string) ?? ticker,
            variacaoPct: (quote.regularMarketChangePercent as number) ?? 0,
            atualizadoEm: new Date().toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn("[Brapi] erro no lote", simbolos, err);
    }

    // Intervalo entre lotes para não sobrecarregar a API
    if (li < lotes.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Marcar como não encontrado os que não vieram
  for (const t of tickers) {
    const key = t.ticker.toUpperCase();
    if (!resultado[key]) {
      resultado[key] = {
        ticker: key,
        tipo: t.tipo,
        preco: 0,
        moeda: "BRL",
        nome: key,
        variacaoPct: 0,
        atualizadoEm: new Date().toISOString(),
        erro: "não encontrado",
      };
    }
  }

  return resultado;
}

// ── COINGECKO — Criptoativos ─────────────────────────────────
const CRIPTO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  ADA: "cardano",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  XRP: "ripple",
  DOGE: "dogecoin",
  SHIB: "shiba-inu",
  LTC: "litecoin",
};

async function buscarCripto(tickers: TickerRequest[]): Promise<Record<string, Cotacao>> {
  const resultado: Record<string, Cotacao> = {};
  if (tickers.length === 0) return resultado;

  const ids = tickers
    .map((t) => CRIPTO_IDS[t.ticker.toUpperCase()])
    .filter(Boolean)
    .join(",");

  if (!ids) {
    for (const t of tickers) {
      resultado[t.ticker.toUpperCase()] = {
        ticker: t.ticker.toUpperCase(),
        tipo: "cripto",
        preco: 0,
        moeda: "BRL",
        nome: t.ticker,
        variacaoPct: 0,
        atualizadoEm: new Date().toISOString(),
        erro: "ticker cripto não mapeado",
      };
    }
    return resultado;
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,brl&include_24hr_change=true`;
  const resp = await fetch(url, { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`CoinGecko erro ${resp.status}`);

  const data = await resp.json();

  for (const t of tickers) {
    const key = t.ticker.toUpperCase();
    const id = CRIPTO_IDS[key];
    const quote = id ? (data[id] as Record<string, number> | undefined) : null;

    if (!quote) {
      resultado[key] = {
        ticker: key,
        tipo: "cripto",
        preco: 0,
        moeda: "BRL",
        nome: key,
        variacaoPct: 0,
        atualizadoEm: new Date().toISOString(),
        erro: "não encontrado",
      };
      continue;
    }

    resultado[key] = {
      ticker: key,
      tipo: "cripto",
      preco: quote.brl ?? quote.usd ?? 0,
      moeda: "BRL",
      nome: key,
      variacaoPct: quote.usd_24h_change ?? 0,
      atualizadoEm: new Date().toISOString(),
    };
  }

  return resultado;
}

// ── YAHOO FINANCE via allorigins — Internacional ─────────────
async function buscarInternacional(tickers: TickerRequest[]): Promise<Record<string, Cotacao>> {
  const resultado: Record<string, Cotacao> = {};
  if (tickers.length === 0) return resultado;

  const simbolos = tickers.map((t) => t.ticker.toUpperCase()).join(",");
  const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${simbolos}&fields=regularMarketPrice,currency,shortName,regularMarketChangePercent`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`;

  const resp = await fetch(proxyUrl, { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`Internacional erro ${resp.status}`);

  const data = await resp.json();
  const quotes: Record<string, unknown>[] = data?.quoteResponse?.result ?? [];

  for (const t of tickers) {
    const key = t.ticker.toUpperCase();
    const quote = quotes.find((q) => (q.symbol as string)?.toUpperCase() === key);

    if (!quote) {
      resultado[key] = {
        ticker: key,
        tipo: t.tipo,
        preco: 0,
        moeda: "USD",
        nome: key,
        variacaoPct: 0,
        atualizadoEm: new Date().toISOString(),
        erro: "não encontrado",
      };
      continue;
    }

    resultado[key] = {
      ticker: key,
      tipo: t.tipo,
      preco: (quote.regularMarketPrice as number) ?? 0,
      moeda: (quote.currency as string) ?? "USD",
      nome: (quote.shortName as string) ?? key,
      variacaoPct: (quote.regularMarketChangePercent as number) ?? 0,
      atualizadoEm: new Date().toISOString(),
    };
  }

  return resultado;
}

// ── HOOK PRINCIPAL ───────────────────────────────────────────
export function useCotacoes() {
  const [cotacoes, setCotacoes] = useState<Record<string, Cotacao>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const buscarCotacoes = useCallback(async (tickers: TickerRequest[]) => {
    if (tickers.length === 0) return;

    // Verificar cache
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
      // Separar por fonte
      const brTickers = precisaBuscar.filter((t) => t.tipo === "acoes" || t.tipo === "fiis");
      const criptoTickers = precisaBuscar.filter((t) => t.tipo === "cripto");
      const extTickers = precisaBuscar.filter((t) => t.tipo === "exterior");

      // Buscar em paralelo
      const [brResult, criptoResult, extResult] = await Promise.allSettled([
        brTickers.length > 0 ? buscarBrapi(brTickers) : Promise.resolve({}),
        criptoTickers.length > 0 ? buscarCripto(criptoTickers) : Promise.resolve({}),
        extTickers.length > 0 ? buscarInternacional(extTickers) : Promise.resolve({}),
      ]);

      const novas: Record<string, Cotacao> = {};

      for (const result of [brResult, criptoResult, extResult]) {
        if (result.status === "fulfilled") {
          Object.assign(novas, result.value);
        } else {
          console.error("[useCotacoes] erro parcial:", result.reason);
        }
      }

      for (const [key, cot] of Object.entries(novas)) {
        cache[key] = { cotacao: cot, ts: Date.now() };
      }

      setCotacoes((prev) => ({ ...prev, ...novas }));

      // Retry individual para BR tickers que vieram sem preço
      const brTickers2 = precisaBuscar.filter((t) => t.tipo === "acoes" || t.tipo === "fiis");
      const semCotacao = brTickers2.filter((t) => {
        const c = novas[t.ticker.toUpperCase()];
        return !c || !!c.erro || c.preco === 0;
      });

      if (semCotacao.length > 0) {
        setTimeout(async () => {
          try {
            const retry = await buscarBrapi(semCotacao);
            const validos = Object.fromEntries(
              Object.entries(retry).filter(([, v]) => v.preco > 0)
            );
            if (Object.keys(validos).length > 0) {
              for (const [key, cot] of Object.entries(validos)) {
                cache[key] = { cotacao: cot, ts: Date.now() };
              }
              setCotacoes((prev) => ({ ...prev, ...validos }));
            }
          } catch (e) {
            console.warn("[useCotacoes] retry falhou:", e);
          }
        }, 500);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("[useCotacoes] erro:", err);
      setErro(err instanceof Error ? err.message : "Erro ao buscar cotações");
    } finally {
      setCarregando(false);
    }
  }, []);

  const limparCache = useCallback(() => {
    Object.keys(cache).forEach((k) => delete cache[k]);
  }, []);

  return { cotacoes, carregando, erro, buscarCotacoes, limparCache };
}
