// ============================================================================
// Seed do modelo de alocação a partir de docs/planilha-alocacao-data.json
// (snapshot extraído do planilha-alocacao.xlsx).
//
// Permite testar a Recomendação Simpla antes de configurar a Edge Function
// de sync com o Google Sheets. Publica uma allocation_version igual à que a
// função criaria.
//
// Uso (service role key NUNCA vai para .env do front — passe só na execução):
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/seed-allocation.mjs
// PowerShell:
//   $env:SUPABASE_URL="https://xxx.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/seed-allocation.mjs
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "docs", "planilha-alocacao-data.json"), "utf-8"));

const faixas = data.faixas.map((f, i) => ({ nome: f.nome, min_patrimonio: f.min, ordem: i }));

const matriz = data.matriz_alocacao.flatMap((m) =>
  Object.entries(m.alocacao).map(([classe, pct]) => ({
    faixa: m.faixa, perfil: m.perfil, classe, pct,
  }))
);

const produtos = data.blocos_produtos.flatMap((b) =>
  b.produtos.map((p, i) => ({
    faixa: b.faixa, perfil: b.perfil, classe: b.categoria,
    nome: p.nome, is_fundo: /^mutual fund/i.test(p.nome), ordem: i,
  }))
);

const precos = data.precos_recomendacoes.map((p) => ({
  ticker: p.ativo, classe: p.classe,
  preco_teto: p.preco_teto ?? null, preco_hoje: p.preco_hoje ?? null,
}));

// validação mínima (mesmo gate da Edge Function)
const somas = new Map();
for (const m of matriz) {
  const k = `${m.faixa}|${m.perfil}`;
  somas.set(k, (somas.get(k) ?? 0) + m.pct);
}
for (const [k, s] of somas) {
  if (Math.abs(s - 1) > 1e-4) {
    console.error(`Combinação ${k} soma ${(s * 100).toFixed(2)}% — abortando.`);
    process.exit(1);
  }
}

const checksum = createHash("sha256")
  .update(JSON.stringify({ faixas, matriz, produtos, precos }))
  .digest("hex");

const admin = createClient(url, key, { auth: { persistSession: false } });
const agora = new Date().toISOString();

const { data: version, error: verErr } = await admin
  .from("allocation_versions")
  .insert({
    source: "seed:planilha-alocacao-data.json",
    checksum,
    status: "staging",
    stats: { faixas: faixas.length, combinacoes: somas.size, produtos: produtos.length, precos: precos.length },
  })
  .select("id")
  .single();
if (verErr) { console.error(verErr); process.exit(1); }

const vid = version.id;
for (const [table, rows] of [
  ["allocation_bands", faixas],
  ["allocation_matrix", matriz],
  ["allocation_products", produtos],
  ["asset_prices", precos.map((p) => ({ ...p, preco_hoje_atualizado_em: agora }))],
]) {
  const { error } = await admin.from(table).insert(rows.map((r) => ({ ...r, version_id: vid })));
  if (error) { console.error(`${table}:`, error); process.exit(1); }
}

const { error: pubErr } = await admin
  .from("allocation_versions")
  .update({ status: "published", published_at: agora })
  .eq("id", vid);
if (pubErr) { console.error(pubErr); process.exit(1); }

console.log(`Publicado: versão ${vid}`);
console.log(`  faixas=${faixas.length} combinações=${somas.size} produtos=${produtos.length} preços=${precos.length}`);
