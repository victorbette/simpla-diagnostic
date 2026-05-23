import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function formatarTicker(ticker: string, tipo: string): string {
  const t = ticker.trim().toUpperCase();
  if (tipo === "acoes" || tipo === "fiis") {
    return t.endsWith(".SA") ? t : `${t}.SA`;
  }
  if (tipo === "cripto") {
    return t.includes("-") ? t : `${t}-USD`;
  }
  return t;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { tickers } = await req.json();

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return new Response(
        JSON.stringify({ error: "tickers obrigatório" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const simbolos = tickers.map((t: { ticker: string; tipo: string }) =>
      formatarTicker(t.ticker, t.tipo)
    );
    const query = simbolos.join(",");

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${query}&fields=regularMarketPrice,currency,shortName,regularMarketChangePercent`;

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    });

    if (!resp.ok) {
      throw new Error(`Yahoo Finance retornou ${resp.status}`);
    }

    const data = await resp.json();
    const quotes = data?.quoteResponse?.result ?? [];

    const resultado: Record<string, unknown> = {};

    for (let i = 0; i < tickers.length; i++) {
      const original = tickers[i].ticker.toUpperCase();
      const tipo = tickers[i].tipo;
      const quote = quotes[i];

      if (!quote) {
        resultado[original] = { erro: "não encontrado" };
        continue;
      }

      const preco = quote.regularMarketPrice ?? 0;
      const moeda = quote.currency ?? "BRL";

      resultado[original] = {
        ticker: original,
        tipo,
        preco,
        moeda,
        nome: quote.shortName ?? original,
        variacaoPct: quote.regularMarketChangePercent ?? 0,
        fonte: "Yahoo Finance",
        atualizadoEm: new Date().toISOString(),
      };
    }

    return new Response(JSON.stringify({ cotacoes: resultado }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
