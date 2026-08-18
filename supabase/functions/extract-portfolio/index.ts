// ============================================================================
// Edge Function: extract-portfolio
// ----------------------------------------------------------------------------
// Recebe prints da carteira do cliente (home broker, app do banco, planilha) e
// devolve as posições extraídas por IA — uma linha por ativo, com o valor
// financeiro atual e a classe sugerida (as 8 do AtivoForm).
//
// A chave da OpenAI fica só aqui (secret do Supabase); o front nunca a vê.
//
// Secrets necessários (supabase secrets set ...):
//   OPENAI_API_KEY   chave da OpenAI (sk-...)
//   OPENAI_MODEL     (opcional) modelo com visão + structured outputs.
//                    Default: gpt-4o
//
// SUPABASE_URL e as chaves de API são injetados pelo runtime — esta função só
// valida o JWT de quem chamou (não toca no banco), então basta a publishable.
//
// Invocação: POST { imagens: string[] } com data URLs (data:image/jpeg;base64,…)
// e Authorization de usuário autenticado.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const MODELO_PADRAO = "gpt-4o";
const MAX_IMAGENS = 6;
const MAX_BYTES_IMAGEM = 5 * 1024 * 1024; // 5 MB por imagem (já decodificada)
const TIMEOUT_MS = 90_000;

// Classes = chaves de AtivoAtual (src/types/financialPlanning.ts).
const CLASSES = [
  "rendaFixa", "acoes", "fiis", "rvGlobal", "rfGlobal",
  "cripto", "alternativos", "previdencia", "naoIdentificado",
] as const;

const PROMPT_SISTEMA = `Você é um assistente de planejamento financeiro que lê PRINTS de carteiras de investimento (home broker, app de banco, corretora, planilha, extrato) e extrai as posições.

Devolva UMA LINHA POR ATIVO visível na imagem, com o patrimônio atual naquele ativo.

REGRAS DE VALOR (campo "valor")
- Use sempre a coluna de valor TOTAL ATUAL da posição: "Valor Total Atual", "Valor Atual", "Saldo Bruto", "Valor Bruto", "Valor de Mercado", "Posição", "Patrimônio", "Saldo", "Total".
- NUNCA use: preço unitário, cotação, preço de fechamento, quantidade, "% da carteira", ganho/perda, rentabilidade, valor aplicado/custo (quando o valor atual também estiver visível).
- Se só houver quantidade e preço unitário, multiplique os dois e use confianca "media".
- Números estão em formato brasileiro: "1.512,75" = 1512.75 e "R$ 4.758,60" = 4758.6. Converta para número puro.
- IGNORE linhas de total, subtotal e consolidado ("Total Geral", "Total da carteira", "Saldo total", "Patrimônio total", somatórios por grupo).
- Se o valor estiver ilegível, cortado ou censurado, use 0 e confianca "baixa".
- Se os valores estiverem em outra moeda (US$), NÃO converta: informe a moeda em "moedaDetectada" e mantenha o número como está.

CLASSIFICAÇÃO (campo "classe") — escolha exatamente uma:
- rendaFixa: CDB, RDB, LCI, LCA, LC, Tesouro Direto/Selic/IPCA/Prefixado, debêntures, CRI, CRA, poupança, fundos DI e de renda fixa Brasil, saldo em conta/caixa/liquidez.
- acoes: ações brasileiras (tickers com final 3, 4, 5, 6 e units), ETFs de ações Brasil (BOVA11, SMAL11), fundos de ações Brasil, opções de ações BR.
- fiis: fundos imobiliários (tickers de final 11 cujo nome cita FII / Fundo Imobiliário), Fiagros, FI-Infra imobiliário.
- rvGlobal: BDRs (tickers de final 31, 32, 33, 34, 35 — ex.: AAPL34, AMZO34, PYPL34), ações e ETFs internacionais (AAPL, VOO, SPY, IVVB11), fundos de ações globais, REITs, conta no exterior aplicada em renda variável.
- rfGlobal: bonds, treasuries, renda fixa internacional, fundos de renda fixa/crédito global, caixa em dólar no exterior.
- cripto: Bitcoin, Ethereum, altcoins, stablecoins, ETFs e fundos de cripto (HASH11, QBTC11, BITH11).
- alternativos: COE, produtos estruturados, fundos cetipados, fundos multimercado, private equity, venture capital, FIDC, precatórios, ouro e commodities.
- previdencia: PGBL, VGBL, planos de previdência privada (qualquer seguradora ou fundo previdenciário).
- naoIdentificado: quando não der para enquadrar com segurança.

CONFIANÇA (campo "confianca")
- "alta": ticker/produto e valor lidos com clareza e classe óbvia.
- "media": leitura ok mas classe ambígua, ou valor calculado por quantidade × preço.
- "baixa": texto borrado, valor parcialmente visível ou produto desconhecido.

Não invente linhas, não agrupe e não some posições. Se a imagem não contiver uma carteira de investimentos, devolva "itens" vazio e explique em "observacoes".`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["itens", "moedaDetectada", "observacoes"],
  properties: {
    itens: {
      type: "array",
      description: "Uma entrada por ativo/posição visível no print.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ativo", "descricao", "valor", "classe", "confianca"],
        properties: {
          ativo: { type: "string", description: "Ticker ou nome curto do produto, como aparece no print." },
          descricao: { type: "string", description: "Nome da empresa/produto ou custódia. Vazio se não houver." },
          valor: { type: "number", description: "Patrimônio atual no ativo, em número puro." },
          classe: { type: "string", enum: CLASSES },
          confianca: { type: "string", enum: ["alta", "media", "baixa"] },
        },
      },
    },
    moedaDetectada: { type: "string", enum: ["BRL", "USD", "outra", "indefinida"] },
    observacoes: { type: "string", description: "Ressalvas relevantes ao consultor. Vazio se não houver." },
  },
} as const;

interface ItemExtraido {
  ativo: string;
  descricao: string;
  valor: number;
  classe: string;
  confianca: string;
}

interface LeituraImagem {
  itens: ItemExtraido[];
  moedaDetectada: string;
  observacoes: string;
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────
async function chamarOpenAI(
  apiKey: string, modelo: string, dataUrl: string, semTemperatura = false,
): Promise<LeituraImagem> {
  // deno-lint-ignore no-explicit-any
  const body: Record<string, any> = {
    model: modelo,
    messages: [
      { role: "system", content: PROMPT_SISTEMA },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extraia todas as posições desta carteira. Uma linha por ativo, com o patrimônio atual de cada um.",
          },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "carteira_extraida", strict: true, schema: SCHEMA },
    },
  };
  if (!semTemperatura) body.temperature = 0;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const texto = await res.text();
    // Modelos de raciocínio recusam temperature != 1 — repete sem o parâmetro
    if (res.status === 400 && !semTemperatura && /temperature/i.test(texto)) {
      return chamarOpenAI(apiKey, modelo, dataUrl, true);
    }
    let detalhe = texto.slice(0, 300);
    try {
      detalhe = JSON.parse(texto)?.error?.message ?? detalhe;
    } catch { /* corpo não-JSON: mantém o texto cru */ }
    throw new Error(`OpenAI ${res.status}: ${detalhe}`);
  }

  const json = await res.json();
  const msg = json?.choices?.[0]?.message;
  if (msg?.refusal) throw new Error(`Modelo recusou a leitura: ${msg.refusal}`);
  const conteudo = msg?.content;
  if (typeof conteudo !== "string" || !conteudo.trim()) {
    throw new Error("Resposta vazia da OpenAI.");
  }
  return JSON.parse(conteudo) as LeituraImagem;
}

// ─── Saneamento do retorno do modelo ──────────────────────────────────────────
function limpar(leitura: LeituraImagem, indiceImagem: number) {
  const itens = (Array.isArray(leitura?.itens) ? leitura.itens : [])
    .map((it) => ({
      ativo: String(it?.ativo ?? "").trim().slice(0, 80),
      descricao: String(it?.descricao ?? "").trim().slice(0, 120),
      valor: Number.isFinite(Number(it?.valor)) ? Math.max(0, Number(it.valor)) : 0,
      classe: (CLASSES as readonly string[]).includes(String(it?.classe))
        ? String(it.classe)
        : "naoIdentificado",
      confianca: ["alta", "media", "baixa"].includes(String(it?.confianca))
        ? String(it.confianca)
        : "media",
      imagem: indiceImagem,
    }))
    // Linha sem identificação e sem valor não ajuda ninguém
    .filter((it) => it.ativo || it.descricao || it.valor > 0);

  return {
    itens,
    moedaDetectada: ["BRL", "USD", "outra", "indefinida"].includes(String(leitura?.moedaDetectada))
      ? String(leitura.moedaDetectada)
      : "indefinida",
    observacoes: String(leitura?.observacoes ?? "").trim().slice(0, 500),
  };
}

/**
 * Chave usada só para validar o token do chamador. No padrão novo de API keys
 * o runtime injeta SUPABASE_PUBLISHABLE_KEYS como JSON ({ default: "sb_publishable_…" });
 * o legado (SUPABASE_ANON_KEY) entra como fallback enquanto as duas convivem.
 * Uma secret key (sb_secret_…) também funcionaria, mas é privilégio demais aqui.
 */
function chaveDeValidacao(): string {
  const novas = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (novas) {
    try {
      const mapa = JSON.parse(novas) as Record<string, string>;
      const chave = mapa.default ?? Object.values(mapa)[0];
      if (chave) return chave;
    } catch { /* JSON inesperado: cai para a chave legada */ }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

function validarImagem(dataUrl: unknown, i: number): string {
  if (typeof dataUrl !== "string") throw new Error(`Imagem ${i + 1}: formato inválido.`);
  const m = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!m) throw new Error(`Imagem ${i + 1}: envie PNG, JPEG, WEBP ou GIF em base64.`);
  const bytes = Math.floor((m[2].replace(/\s/g, "").length * 3) / 4);
  if (bytes > MAX_BYTES_IMAGEM) {
    throw new Error(`Imagem ${i + 1}: ${(bytes / 1024 / 1024).toFixed(1)} MB excede o limite de 5 MB.`);
  }
  return dataUrl;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  const headers = { ...CORS, "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), { status: 405, headers });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = chaveDeValidacao();
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const modelo = Deno.env.get("OPENAI_MODEL") || MODELO_PADRAO;

  if (!apiKey) {
    return new Response(JSON.stringify({
      error: "Secret OPENAI_API_KEY não configurado no projeto Supabase.",
    }), { status: 500, headers });
  }

  // Autorização: só usuário autenticado do app
  const auth = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user }, error: authErr } = await auth.auth.getUser(jwt);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Não autorizado." }), { status: 401, headers });
  }

  try {
    const corpo = await req.json().catch(() => null);
    const imagens = corpo?.imagens;
    if (!Array.isArray(imagens) || imagens.length === 0) {
      return new Response(JSON.stringify({ error: "Envie ao menos uma imagem." }), { status: 400, headers });
    }
    if (imagens.length > MAX_IMAGENS) {
      return new Response(JSON.stringify({
        error: `Máximo de ${MAX_IMAGENS} imagens por vez.`,
      }), { status: 400, headers });
    }

    let validas: string[];
    try {
      validas = imagens.map(validarImagem);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers });
    }

    // Uma chamada por imagem: prompt mais simples e cada linha sabe de onde veio
    const resultados = await Promise.allSettled(
      validas.map((img) => chamarOpenAI(apiKey, modelo, img)),
    );

    const itens: ReturnType<typeof limpar>["itens"] = [];
    const observacoes: string[] = [];
    const erros: { imagem: number; erro: string }[] = [];
    const moedas = new Set<string>();

    resultados.forEach((r, i) => {
      if (r.status === "rejected") {
        const e = r.reason;
        erros.push({ imagem: i, erro: e instanceof Error ? e.message : String(e) });
        return;
      }
      const lida = limpar(r.value, i);
      itens.push(...lida.itens);
      if (lida.observacoes) observacoes.push(`Imagem ${i + 1}: ${lida.observacoes}`);
      if (lida.moedaDetectada !== "indefinida") moedas.add(lida.moedaDetectada);
    });

    if (itens.length === 0 && erros.length === validas.length) {
      return new Response(JSON.stringify({ error: erros[0].erro, erros }), { status: 502, headers });
    }

    return new Response(JSON.stringify({
      itens,
      observacoes,
      erros,
      moedas: [...moedas],
      modelo,
    }), { headers });
  } catch (err) {
    console.error("extract-portfolio:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers });
  }
});
