export interface CotacaoAtivo {
  ticker: string;
  preco: number;
  moeda: 'BRL' | 'USD';
  variacao: number;
  nome: string;
  fonte: string;
  atualizadoEm: string;
  erro?: string;
}

type TipoAtivo = 'acoes' | 'fiis' | 'exterior' | 'cripto';

export async function buscarCotacoesIA(
  tickers: Array<{ ticker: string; tipo: TipoAtivo }>
): Promise<Record<string, CotacaoAtivo>> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY não configurado');
  if (!tickers.length) return {};

  const lista = tickers.map(({ ticker, tipo }) => `${ticker} (${tipo})`).join(', ');

  const prompt = `Busque as cotações atuais dos seguintes ativos financeiros e retorne SOMENTE um JSON válido, sem markdown, sem texto adicional.

Ativos: ${lista}

Formato exato (não adicione nada fora deste JSON):
{"cotacoes":{"TICKER":{"ticker":"TICKER","preco":0.00,"moeda":"BRL","variacao":0.00,"nome":"Nome completo","fonte":"Fonte"}}}

Regras:
- moeda "BRL" para ações B3, FIIs, ativos em reais; "USD" para internacionais e cripto em dólar
- variacao = variação percentual do dia (número, ex: 1.23 ou -0.45)
- Para ações brasileiras: formato XXXX3/XXXX4/XXXX11
- Para ETFs internacionais (VOO, QQQ, BRK): moeda "USD"
- Retorne SOMENTE o JSON, sem qualquer texto antes ou depois`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json() as {
    content: Array<{ type: string; text?: string }>;
  };

  const texto = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('');

  const match = texto.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Resposta da IA não contém JSON válido');

  const parsed = JSON.parse(match[0]) as {
    cotacoes: Record<string, Omit<CotacaoAtivo, 'atualizadoEm'>>;
  };

  const agora = new Date().toISOString();
  const resultado: Record<string, CotacaoAtivo> = {};
  for (const [key, c] of Object.entries(parsed.cotacoes ?? {})) {
    resultado[key.toUpperCase()] = { ...c, ticker: key.toUpperCase(), atualizadoEm: agora };
  }
  return resultado;
}
