// ============================================================================
// Edge Function: extract-tax-data
// ----------------------------------------------------------------------------
// Recebe um Informe de Rendimentos, DIRF, holerite ou qualquer documento fiscal
// em print, PDF ou texto e devolve os campos necessários para a calculadora
// PGBL/IR: renda bruta, INSS, IR retido, dependentes, despesas médicas,
// de instrução e pensão alimentícia.
//
// A chave da OpenAI fica só aqui (secret do Supabase); o front nunca a vê.
//
// Secrets necessários (supabase secrets set ...):
//   OPENAI_API_KEY   chave da OpenAI (sk-...)
//   OPENAI_MODEL     (opcional) Default: gpt-4o
//
// Invocação: POST { fontes: [{ tipo, conteudo, nome }] } com Authorization de
// usuário autenticado. `tipo` é "imagem", "pdf" ou "texto".
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const MODELO_PADRAO = "gpt-4o";
const MAX_FONTES = 5;
const MAX_BYTES_IMAGEM = 5 * 1024 * 1024;
const MAX_BYTES_PDF = 8 * 1024 * 1024;
const MAX_CHARS_TEXTO = 100_000;
const MAX_BYTES_TOTAL = 20 * 1024 * 1024;
const TIMEOUT_MS = 90_000;

const PROMPT_SISTEMA = `Você é um assistente de planejamento financeiro especializado em declaração de Imposto de Renda brasileiro.

Analise o documento fiscal enviado — pode ser um Informe de Rendimentos, DIRF, holerite, extrato bancário ou qualquer documento que contenha informações tributárias — e extraia os seguintes campos para o ano-base mais recente encontrado no documento:

1. rendaAnualBruta: Rendimentos tributáveis recebidos de pessoa jurídica (salário bruto anual, pró-labore, aluguéis tributáveis etc.). No Informe de Rendimentos da empresa, é o campo "Rendimentos tributáveis pagos ou creditados".
2. inssPago: INSS pago/retido no ano. No Informe de Rendimentos, é a "Contribuição Previdenciária Oficial (INSS)" ou campo equivalente.
3. irRetidoFonte: IR retido na fonte no ano inteiro. No Informe de Rendimentos, é "Imposto de Renda Retido na Fonte".
4. dependentes: Número de dependentes declarados (inteiro, 0 se não houver).
5. despesasMedicas: Total de despesas médicas e de saúde do ano (consultas, plano de saúde, internações etc.). Se não encontrado, 0.
6. despesasInstrucao: Total de despesas com instrução/educação do ano (escola, faculdade, pós etc.). Limite legal de R$ 3.561,50 por pessoa por ano. Se não encontrado, 0.
7. pensaoAlimenticia: Pensão alimentícia paga no ano por decisão judicial ou acordo. Se não encontrado, 0.

REGRAS:
- Valores em formato brasileiro ("1.512,75") devem ser convertidos para número puro (1512.75).
- Se o campo existir claramente no documento, confianca = "alta".
- Se o campo for deduzido ou estimado, confianca = "media".
- Se o campo não for encontrado, encontrado = false e valor = 0, confianca = "baixa".
- Nunca invente valores. Se um campo não está no documento, use encontrado: false.
- O ano de referência pode aparecer como "Ano-Calendário", "Ano Base", "Exercício" ou diretamente nas datas.
- Se houver múltiplas fontes de renda, some os valores da mesma natureza.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["rendaAnualBruta", "inssPago", "irRetidoFonte", "dependentes", "despesasMedicas", "despesasInstrucao", "pensaoAlimenticia", "observacoes"],
  properties: {
    rendaAnualBruta: {
      type: "object",
      additionalProperties: false,
      required: ["valor", "confianca", "encontrado"],
      properties: {
        valor: { type: "number" },
        confianca: { type: "string", enum: ["alta", "media", "baixa"] },
        encontrado: { type: "boolean" },
      },
    },
    inssPago: {
      type: "object",
      additionalProperties: false,
      required: ["valor", "confianca", "encontrado"],
      properties: {
        valor: { type: "number" },
        confianca: { type: "string", enum: ["alta", "media", "baixa"] },
        encontrado: { type: "boolean" },
      },
    },
    irRetidoFonte: {
      type: "object",
      additionalProperties: false,
      required: ["valor", "confianca", "encontrado"],
      properties: {
        valor: { type: "number" },
        confianca: { type: "string", enum: ["alta", "media", "baixa"] },
        encontrado: { type: "boolean" },
      },
    },
    dependentes: {
      type: "object",
      additionalProperties: false,
      required: ["valor", "confianca", "encontrado"],
      properties: {
        valor: { type: "integer", minimum: 0 },
        confianca: { type: "string", enum: ["alta", "media", "baixa"] },
        encontrado: { type: "boolean" },
      },
    },
    despesasMedicas: {
      type: "object",
      additionalProperties: false,
      required: ["valor", "confianca", "encontrado"],
      properties: {
        valor: { type: "number" },
        confianca: { type: "string", enum: ["alta", "media", "baixa"] },
        encontrado: { type: "boolean" },
      },
    },
    despesasInstrucao: {
      type: "object",
      additionalProperties: false,
      required: ["valor", "confianca", "encontrado"],
      properties: {
        valor: { type: "number" },
        confianca: { type: "string", enum: ["alta", "media", "baixa"] },
        encontrado: { type: "boolean" },
      },
    },
    pensaoAlimenticia: {
      type: "object",
      additionalProperties: false,
      required: ["valor", "confianca", "encontrado"],
      properties: {
        valor: { type: "number" },
        confianca: { type: "string", enum: ["alta", "media", "baixa"] },
        encontrado: { type: "boolean" },
      },
    },
    observacoes: {
      type: "string",
      description: "Ressalvas relevantes ao consultor, como múltiplos anos no documento, campos ambíguos ou dados incompletos. Vazio se não houver.",
    },
  },
} as const;

type TipoFonte = "imagem" | "pdf" | "texto";

interface Fonte {
  tipo: TipoFonte;
  conteudo: string;
  nome: string;
  bytes: number;
}

interface CampoExtraido {
  valor: number;
  confianca: "alta" | "media" | "baixa";
  encontrado: boolean;
}

interface DadosFiscais {
  rendaAnualBruta: CampoExtraido;
  inssPago: CampoExtraido;
  irRetidoFonte: CampoExtraido;
  dependentes: CampoExtraido;
  despesasMedicas: CampoExtraido;
  despesasInstrucao: CampoExtraido;
  pensaoAlimenticia: CampoExtraido;
  observacoes: string;
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
function partesDaFonte(fonte: Fonte): any[] {
  const instrucao = {
    type: "text",
    text: "Extraia as informações fiscais deste documento conforme as instruções.",
  };

  if (fonte.tipo === "imagem") {
    return [instrucao, { type: "image_url", image_url: { url: fonte.conteudo, detail: "high" } }];
  }
  if (fonte.tipo === "pdf") {
    return [instrucao, { type: "file", file: { filename: fonte.nome, file_data: fonte.conteudo } }];
  }
  return [instrucao, { type: "text", text: `Conteúdo do documento fiscal:\n\n${fonte.conteudo}` }];
}

async function chamarOpenAI(
  apiKey: string, modelo: string, fontes: Fonte[], semTemperatura = false,
): Promise<DadosFiscais> {
  const partes = fontes.flatMap(partesDaFonte);

  // deno-lint-ignore no-explicit-any
  const body: Record<string, any> = {
    model: modelo,
    messages: [
      { role: "system", content: PROMPT_SISTEMA },
      { role: "user", content: partes },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "dados_fiscais", strict: true, schema: SCHEMA },
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
    if (res.status === 400 && !semTemperatura && /temperature/i.test(texto)) {
      return chamarOpenAI(apiKey, modelo, fontes, true);
    }
    let detalhe = texto.slice(0, 300);
    try {
      detalhe = JSON.parse(texto)?.error?.message ?? detalhe;
    } catch { /* corpo não-JSON */ }
    throw new Error(`OpenAI ${res.status}: ${detalhe}`);
  }

  const json = await res.json();
  const msg = json?.choices?.[0]?.message;
  if (msg?.refusal) throw new Error(`Modelo recusou a leitura: ${msg.refusal}`);
  const conteudo = msg?.content;
  if (typeof conteudo !== "string" || !conteudo.trim()) {
    throw new Error("Resposta vazia da OpenAI.");
  }
  return JSON.parse(conteudo) as DadosFiscais;
}

// ─── Validação de fontes ──────────────────────────────────────────────────────

function bytesDeBase64(b64: string): number {
  return Math.floor((b64.replace(/\s/g, "").length * 3) / 4);
}

function validarFonte(bruta: unknown, i: number): Fonte {
  const ref = `Fonte ${i + 1}`;
  if (!bruta || typeof bruta !== "object") throw new Error(`${ref}: formato inválido.`);

  const { tipo, conteudo, nome } = bruta as Record<string, unknown>;
  if (typeof conteudo !== "string" || !conteudo) throw new Error(`${ref}: conteúdo vazio.`);
  const rotulo = typeof nome === "string" && nome.trim() ? nome.trim().slice(0, 120) : ref;

  if (tipo === "texto") {
    const texto = conteudo.trim();
    if (!texto) throw new Error(`${rotulo}: texto vazio.`);
    if (texto.length > MAX_CHARS_TEXTO) {
      throw new Error(`${rotulo}: ${texto.length} caracteres excedem o limite de ${MAX_CHARS_TEXTO}.`);
    }
    return { tipo, conteudo: texto, nome: rotulo, bytes: texto.length };
  }

  if (tipo === "imagem") {
    const m = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/.exec(conteudo);
    if (!m) throw new Error(`${rotulo}: envie PNG, JPEG, WEBP ou GIF em base64.`);
    const bytes = bytesDeBase64(m[2]);
    if (bytes > MAX_BYTES_IMAGEM) {
      throw new Error(`${rotulo}: ${(bytes / 1024 / 1024).toFixed(1)} MB excedem o limite de 5 MB.`);
    }
    return { tipo, conteudo, nome: rotulo, bytes };
  }

  if (tipo === "pdf") {
    const m = /^data:application\/pdf;base64,([A-Za-z0-9+/=\s]+)$/.exec(conteudo);
    if (!m) throw new Error(`${rotulo}: PDF precisa vir como data:application/pdf;base64.`);
    const bytes = bytesDeBase64(m[1]);
    if (bytes > MAX_BYTES_PDF) {
      throw new Error(`${rotulo}: ${(bytes / 1024 / 1024).toFixed(1)} MB excedem o limite de 8 MB.`);
    }
    return { tipo, conteudo, nome: rotulo, bytes };
  }

  throw new Error(`${ref}: tipo "${String(tipo)}" não suportado (use imagem, pdf ou texto).`);
}

function lerFontes(corpo: Record<string, unknown> | null): Fonte[] {
  const brutas = Array.isArray(corpo?.fontes) ? corpo.fontes : null;

  if (!brutas || brutas.length === 0) {
    throw new Error("Envie ao menos um documento fiscal.");
  }
  if (brutas.length > MAX_FONTES) {
    throw new Error(`Máximo de ${MAX_FONTES} arquivos ou textos por vez.`);
  }

  const fontes = brutas.map(validarFonte);
  const total = fontes.reduce((acc, f) => acc + f.bytes, 0);
  if (total > MAX_BYTES_TOTAL) {
    throw new Error(
      `Lote de ${(total / 1024 / 1024).toFixed(1)} MB excede o limite de ${MAX_BYTES_TOTAL / 1024 / 1024} MB. Envie em partes menores.`,
    );
  }
  return fontes;
}

function chaveDeValidacao(): string {
  const novas = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (novas) {
    try {
      const mapa = JSON.parse(novas) as Record<string, string>;
      const chave = mapa.default ?? Object.values(mapa)[0];
      if (chave) return chave;
    } catch { /* JSON inesperado */ }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
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

  const auth = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user }, error: authErr } = await auth.auth.getUser(jwt);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Não autorizado." }), { status: 401, headers });
  }

  let fontes: Fonte[];
  try {
    const corpo = await req.json().catch(() => null);
    fontes = lerFontes(corpo);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers });
  }

  try {
    // Todas as fontes vão juntas numa única chamada (o contexto fiscal vem de um
    // mesmo conjunto de documentos do cliente), ao contrário da carteira que
    // paraleliza para somar posições de corretoras diferentes.
    const dados = await chamarOpenAI(apiKey, modelo, fontes);

    return new Response(JSON.stringify({ dados, modelo }), { headers });
  } catch (err) {
    console.error("extract-tax-data:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers });
  }
});
