// ============================================================================
// Edge Function: sync-allocation
// ----------------------------------------------------------------------------
// Lê a planilha de alocação no Google Sheets (via service account somente-
// leitura), valida a estrutura e grava uma nova versão nas tabelas
// allocation_* do Supabase. O app nunca fala com o Google — só com o banco.
//
// Secrets necessários (supabase secrets set ...):
//   GOOGLE_SA_EMAIL        e-mail da service account (…@…iam.gserviceaccount.com)
//   GOOGLE_SA_PRIVATE_KEY  private_key do JSON da service account (PEM, com \n)
//   ALLOCATION_SHEET_ID    id da planilha (trecho entre /d/ e /edit na URL)
//   CRON_SECRET            (opcional) segredo p/ invocação agendada sem JWT de usuário
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados pelo runtime.
//
// Invocação: POST com Authorization de usuário autenticado, ou header
// x-cron-secret igual ao CRON_SECRET (para agendamento).
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

// ─── Constantes do modelo (devem casar com src/lib/carteira/alocacaoSimpla.ts) ─
const CLASSES = [
  "Renda Fixa pós curta", "Renda fixa pós longa", "IPCA Curto", "IPCA Longo",
  "Infra IPCA", "Infra CDI", "Prefixado", "Ações", "FIIs", "Exterior", "Bitcoin",
] as const;
const PERFIS = ["Conservador", "Conservador Moderado", "Moderado", "Arrojado"];
const CLASSES_COM_PRECO = new Set(["Ações", "FIIs"]);
const PCT_TOLERANCIA = 1e-4;

// ─── Google auth: service account JWT → access token ─────────────────────────
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

function b64url(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function googleAccessToken(saEmail: string, saKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: saEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const key = await crypto.subtle.importKey(
    "pkcs8", pemToArrayBuffer(saKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`),
  );
  const jwt = `${header}.${claims}.${b64url(new Uint8Array(sig))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Google token: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.access_token as string;
}

// ─── Google Sheets: batchGet de ranges ────────────────────────────────────────
// deno-lint-ignore no-explicit-any
type Cell = any;

async function batchGetValues(
  sheetId: string, token: string, ranges: string[],
): Promise<Cell[][][]> {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet`);
  for (const r of ranges) url.searchParams.append("ranges", r);
  url.searchParams.set("valueRenderOption", "UNFORMATTED_VALUE");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets batchGet: ${res.status} ${await res.text()}`);
  const json = await res.json();
  // deno-lint-ignore no-explicit-any
  return (json.valueRanges as any[]).map((vr) => vr.values ?? []);
}

// ─── Parsing ──────────────────────────────────────────────────────────────────
interface Parsed {
  faixas: { nome: string; min_patrimonio: number; ordem: number }[];
  matriz: { faixa: string; perfil: string; classe: string; pct: number }[];
  produtos: { faixa: string; perfil: string; classe: string; nome: string; is_fundo: boolean; ordem: number }[];
  precos: { ticker: string; classe: string; preco_teto: number | null; preco_hoje: number | null }[];
}

function asNum(v: Cell): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}
function asStr(v: Cell): string {
  return v == null ? "" : String(v).trim();
}

async function readSheet(sheetId: string, token: string): Promise<Parsed> {
  const [params, precosRaw, blocoMap] = await batchGetValues(sheetId, token, [
    "'Parâmetros'!A1:V30",
    "'Preços e Recomendações'!A1:H100",
    "'_BlocoMap'!A1:D500",
  ]);

  // Parâmetros — matriz (A..M) + faixas (R,S)
  const matriz: Parsed["matriz"] = [];
  const faixas: Parsed["faixas"] = [];
  for (let i = 1; i < params.length; i++) {
    const row = params[i];
    const faixa = asStr(row[0]), perfil = asStr(row[1]);
    if (faixa && perfil) {
      CLASSES.forEach((classe, c) => {
        matriz.push({ faixa, perfil, classe, pct: asNum(row[2 + c]) ?? 0 });
      });
    }
    const faixaNome = asStr(row[17]);            // coluna R
    const faixaMin = asNum(row[18]);             // coluna S
    if (faixaNome && faixaMin != null) {
      faixas.push({ nome: faixaNome, min_patrimonio: faixaMin, ordem: faixas.length });
    }
  }

  // Preços e Recomendações — A=ticker, B=classe, C=teto, D=hoje (GOOGLEFINANCE)
  const precos: Parsed["precos"] = [];
  for (let i = 1; i < precosRaw.length; i++) {
    const row = precosRaw[i];
    const ticker = asStr(row[0]);
    if (!ticker || ticker.startsWith("Preencha")) continue;
    precos.push({
      ticker,
      classe: asStr(row[1]),
      preco_teto: asNum(row[2]),
      preco_hoje: asNum(row[3]),
    });
  }

  // _BlocoMap — chave Faixa|Perfil|Classe → (aba, linha inicial, linha final)
  const blocos: { faixa: string; perfil: string; classe: string; aba: string; li: number; lf: number }[] = [];
  for (let i = 1; i < blocoMap.length; i++) {
    const row = blocoMap[i];
    const key = asStr(row[0]);
    if (!key) continue;
    const [faixa, perfil, classe] = key.split("|");
    const aba = asStr(row[1]);
    const li = asNum(row[2]), lf = asNum(row[3]);
    if (!faixa || !perfil || !classe || !aba || li == null || lf == null) continue;
    blocos.push({ faixa, perfil, classe, aba, li, lf });
  }

  // Abas de faixa — busca coluna B (nomes) inteira de cada aba distinta
  const abas = [...new Set(blocos.map((b) => b.aba))];
  const abaValues = await batchGetValues(sheetId, token, abas.map((a) => `'${a}'!B1:B1000`));
  const colB = new Map<string, Cell[][]>(abas.map((a, i) => [a, abaValues[i]]));

  const produtos: Parsed["produtos"] = [];
  for (const b of blocos) {
    const col = colB.get(b.aba) ?? [];
    let ordem = 0;
    for (let linha = b.li; linha <= b.lf; linha++) {
      const nome = asStr(col[linha - 1]?.[0]);   // linhas da planilha são 1-based
      if (!nome) continue;
      produtos.push({
        faixa: b.faixa, perfil: b.perfil, classe: b.classe,
        nome, is_fundo: /^mutual fund/i.test(nome), ordem: ordem++,
      });
    }
  }

  return { faixas, matriz, produtos, precos };
}

// ─── Validação (gate de publicação) ──────────────────────────────────────────
function validate(p: Parsed): { fatais: string[]; avisos: string[] } {
  const fatais: string[] = [];
  const avisos: string[] = [];

  if (p.faixas.length < 2) fatais.push(`Só ${p.faixas.length} faixas encontradas — estrutura da aba Parâmetros mudou?`);
  for (let i = 1; i < p.faixas.length; i++) {
    if (p.faixas[i].min_patrimonio <= p.faixas[i - 1].min_patrimonio) {
      fatais.push(`Mínimos das faixas fora de ordem: ${p.faixas[i - 1].nome} → ${p.faixas[i].nome}`);
    }
  }

  const combos = new Map<string, number>();
  for (const m of p.matriz) {
    if (!(CLASSES as readonly string[]).includes(m.classe)) fatais.push(`Classe desconhecida na matriz: ${m.classe}`);
    if (!PERFIS.includes(m.perfil)) fatais.push(`Perfil desconhecido na matriz: ${m.perfil}`);
    const k = `${m.faixa}|${m.perfil}`;
    combos.set(k, (combos.get(k) ?? 0) + m.pct);
  }
  if (combos.size === 0) fatais.push("Matriz de alocação vazia.");
  for (const [k, soma] of combos) {
    if (Math.abs(soma - 1) > PCT_TOLERANCIA) {
      fatais.push(`Combinação ${k} soma ${(soma * 100).toFixed(2)}% (esperado 100%).`);
    }
  }

  const faixaNomes = new Set(p.faixas.map((f) => f.nome));
  for (const k of combos.keys()) {
    const faixa = k.split("|")[0];
    if (!faixaNomes.has(faixa)) fatais.push(`Faixa da matriz sem definição de mínimo: ${faixa}`);
  }

  const tickers = new Set(p.precos.map((x) => x.ticker));
  for (const prod of p.produtos) {
    if (!combos.has(`${prod.faixa}|${prod.perfil}`)) {
      fatais.push(`Bloco de produtos sem linha na matriz: ${prod.faixa}|${prod.perfil}`);
    }
    if (CLASSES_COM_PRECO.has(prod.classe) && !tickers.has(prod.nome)) {
      avisos.push(`Ticker sem preço cadastrado (ficará com peso 0): ${prod.nome} em ${prod.faixa}|${prod.perfil}`);
    }
  }
  for (const preco of p.precos) {
    if (preco.preco_teto == null) avisos.push(`Preço Teto vazio para ${preco.ticker}.`);
    if (preco.preco_hoje == null) avisos.push(`Preço de Hoje vazio para ${preco.ticker} (GOOGLEFINANCE falhou?).`);
  }

  return { fatais: [...new Set(fatais)], avisos: [...new Set(avisos)] };
}

// ─── Checksum ─────────────────────────────────────────────────────────────────
async function checksum(p: Parsed): Promise<string> {
  const canonical = JSON.stringify(p);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Handler ──────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  const headers = { ...CORS, "Content-Type": "application/json" };
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), { status: 405, headers });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const saEmail = Deno.env.get("GOOGLE_SA_EMAIL");
  const saKey = Deno.env.get("GOOGLE_SA_PRIVATE_KEY")?.replace(/\\n/g, "\n");
  const sheetId = Deno.env.get("ALLOCATION_SHEET_ID");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!saEmail || !saKey || !sheetId) {
    return new Response(JSON.stringify({
      error: "Secrets GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY / ALLOCATION_SHEET_ID não configurados.",
    }), { status: 500, headers });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Autorização: usuário autenticado OU segredo do cron
  const viaCron = cronSecret && req.headers.get("x-cron-secret") === cronSecret;
  if (!viaCron) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error } = await admin.auth.getUser(jwt);
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), { status: 401, headers });
    }
  }

  try {
    const token = await googleAccessToken(saEmail, saKey);
    const parsed = await readSheet(sheetId, token);
    const sum = await checksum(parsed);
    const agora = new Date().toISOString();

    // Idempotência: se nada mudou desde a última versão publicada, não regrava
    const { data: last } = await admin
      .from("allocation_versions")
      .select("id, checksum, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (last?.checksum === sum) {
      return new Response(JSON.stringify({
        status: "unchanged", version_id: last.id, published_at: last.published_at,
      }), { headers });
    }

    const { fatais, avisos } = validate(parsed);
    const stats = {
      faixas: parsed.faixas.length,
      combinacoes: new Set(parsed.matriz.map((m) => `${m.faixa}|${m.perfil}`)).size,
      produtos: parsed.produtos.length,
      precos: parsed.precos.length,
      avisos: avisos.length,
    };

    const { data: version, error: verErr } = await admin
      .from("allocation_versions")
      .insert({
        source: sheetId,
        checksum: sum,
        status: fatais.length ? "rejected" : "staging",
        stats,
        errors: [...fatais.map((m) => ({ nivel: "fatal", msg: m })), ...avisos.map((m) => ({ nivel: "aviso", msg: m }))],
      })
      .select("id")
      .single();
    if (verErr) throw verErr;

    if (fatais.length) {
      return new Response(JSON.stringify({
        status: "rejected", version_id: version.id, fatais, avisos,
      }), { status: 422, headers });
    }

    const vid = version.id;
    const inserts = [
      admin.from("allocation_bands").insert(parsed.faixas.map((f) => ({ ...f, version_id: vid }))),
      admin.from("allocation_matrix").insert(parsed.matriz.map((m) => ({ ...m, version_id: vid }))),
      admin.from("allocation_products").insert(parsed.produtos.map((x) => ({ ...x, version_id: vid }))),
      admin.from("asset_prices").insert(parsed.precos.map((x) => ({
        ...x, version_id: vid, preco_hoje_atualizado_em: agora,
      }))),
    ];
    for (const ins of inserts) {
      const { error } = await ins;
      if (error) throw error;
    }

    const { error: pubErr } = await admin
      .from("allocation_versions")
      .update({ status: "published", published_at: agora })
      .eq("id", vid);
    if (pubErr) throw pubErr;

    return new Response(JSON.stringify({ status: "published", version_id: vid, stats, avisos }), { headers });
  } catch (err) {
    console.error("sync-allocation:", err);
    // PostgrestError é objeto plano (não Error) — extrai message/hint antes de serializar
    const e = err as { message?: unknown; hint?: unknown };
    const msg = err instanceof Error
      ? err.message
      : typeof e?.message === "string"
        ? [e.message, typeof e.hint === "string" ? e.hint : null].filter(Boolean).join(" — ")
        : JSON.stringify(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers });
  }
});
