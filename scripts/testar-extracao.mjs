// ============================================================================
// Teste manual da Edge Function extract-portfolio.
// Envia uma imagem local e imprime o que a IA extraiu — útil para calibrar o
// prompt sem precisar clicar na interface.
//
//   $env:TEST_EMAIL="voce@simpla.com"      # usuário do app (a função exige JWT)
//   $env:TEST_PASSWORD="..."
//   node scripts/testar-extracao.mjs print.jpeg
//
// URL e publishable key saem do .env do projeto; dá para sobrescrever com
// SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY no ambiente.
// ============================================================================

import { readFileSync, existsSync } from "node:fs";
import { extname, basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

function lerDotEnv(chave) {
  if (!existsSync(".env")) return undefined;
  const linha = readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${chave}=`));
  return linha?.slice(linha.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") || undefined;
}

const url = process.env.SUPABASE_URL ?? lerDotEnv("VITE_SUPABASE_URL");
const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? lerDotEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
const email = process.env.TEST_EMAIL;
const senha = process.env.TEST_PASSWORD;
const arquivos = process.argv.slice(2);

if (!url || !anon) {
  console.error("Não achei VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY no .env (rode a partir da raiz do projeto).");
  process.exit(1);
}
if (!email || !senha || arquivos.length === 0) {
  console.error("Defina TEST_EMAIL e TEST_PASSWORD e passe ao menos uma imagem.");
  process.exit(1);
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

const imagens = arquivos.map((caminho) => {
  const mime = MIME[extname(caminho).toLowerCase()];
  if (!mime) throw new Error(`Extensão não suportada: ${caminho}`);
  return `data:${mime};base64,${readFileSync(caminho).toString("base64")}`;
});

const supabase = createClient(url, anon);
const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: senha });
if (authErr) {
  console.error("Login falhou:", authErr.message);
  process.exit(1);
}

const inicio = Date.now();
const { data, error } = await supabase.functions.invoke("extract-portfolio", {
  method: "POST",
  body: { imagens },
});

if (error) {
  const corpo = await error.context?.json?.().catch(() => null);
  console.error("Erro:", corpo?.error ?? error.message);
  process.exit(1);
}

console.log(`\nModelo: ${data.modelo} — ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
if (data.erros?.length) console.log("Falhas:", data.erros);
if (data.observacoes?.length) console.log("Observações:", data.observacoes);

let total = 0;
for (const it of data.itens) {
  total += it.valor;
  const origem = arquivos[it.imagem] ? basename(arquivos[it.imagem]) : "?";
  const extra = [it.segmento, it.vencimento].filter(Boolean).join(" ");
  console.log(
    `${it.ativo.padEnd(12)} ${it.classe.padEnd(15)} ${(extra || "-").padEnd(18)} ${it.valor.toFixed(2).padStart(14)}  [${it.confianca}] ${origem}`,
  );
}
console.log(`${"TOTAL".padEnd(47)} ${total.toFixed(2).padStart(14)}  (${data.itens.length} ativos)\n`);
