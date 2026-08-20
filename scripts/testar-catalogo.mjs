// ============================================================================
// Teste do catálogo de ativos (src/lib/carteira/catalogo.ts).
//
//   node scripts/testar-catalogo.mjs
//
// Cobre os dois lados que importam: os formatos em que um ticker aparece de
// verdade num extrato ("PETR4 - PETROBRAS PN", "HGLG11 CI", "PETR4F") e os
// falsos positivos que a busca precisa recusar — há tickers no catálogo que
// também são palavras (META, VOO, WELL) ou siglas de corretora (XP), e casar
// um deles no meio de uma descrição reclassificaria o ativo errado.
//
// O módulo é TypeScript, então bundlamos com o esbuild que já vem com o Vite.
// ============================================================================

import { build } from "esbuild";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

const saida = join(tmpdir(), `catalogo-teste-${process.pid}.mjs`);
await build({
  entryPoints: ["src/lib/carteira/catalogo.ts"],
  bundle: true, format: "esm", platform: "node", outfile: saida, logLevel: "error",
});
const { resolverAtivo, segmentoNoCard, sugerirAtivos, CATALOGO_TOTAL } =
  await import(pathToFileURL(saida).href);
rmSync(saida, { force: true });

/** [textos passados à busca, "card/segmento" esperado ou null para não casar] */
const CASOS = [
  // — como o ticker chega de um print, PDF ou planilha —
  [["PETR4"], "acoes/Petróleo, Gás e Biocombustíveis"],
  [["PETR4 - PETROBRAS PN"], "acoes/Petróleo, Gás e Biocombustíveis"],
  [["petr4"], "acoes/Petróleo, Gás e Biocombustíveis"],
  [["PETR4F"], "acoes/Petróleo, Gás e Biocombustíveis"],   // fracionário
  [["PETR4.SA"], "acoes/Petróleo, Gás e Biocombustíveis"], // sufixo de cotação
  [["HGLG11 CI"], "fiis/Galpões Log."],
  [["", "FII HGLG11 - CSHG LOGISTICA"], "fiis/Galpões Log."], // achou na descrição
  [["ITSA4"], "acoes/Financeiro"],
  [["BOVA11"], "acoes/ETF Brasil"],       // ETF de índice brasileiro não é exterior
  [["HASH11"], "cripto/ETF Cripto"],
  [["A1RE34"], "exterior/REITs"],
  [["SGOV"], "exterior/ETF RF"],
  [["V"], "exterior/Stocks"],             // ticker de 1 letra, só como texto inteiro

  // BDR segue a classe da lista, e ela separa pela empresa, não pelo papel:
  // BDR de empresa estrangeira é exterior; BDR de empresa brasileira listada
  // fora (Nubank, XP, Inter, JBS, Aura) fica em ações, junto com o ticker
  // americano correspondente.
  [["AAPL34"], "exterior/Stocks"],
  [["AAPL"], "exterior/Stocks"],
  [["ROXO34"], "acoes/Bancos"],
  [["NU"], "acoes/Bancos"],
  [["XP"], "acoes/Financeiro"],

  // — o que NÃO pode casar —
  [["XP Investimentos CCB 2028"], null],  // XP no meio da frase é a corretora
  [["Meta de aporte mensal"], null],      // META é ticker, "Meta" é palavra
  [["Fundo Trend Voo Livre"], null],      // idem VOO
  [["CDB Banco Master 2028 PRE"], null],
  [["Tesouro IPCA+ 2035"], null],
  [["LCA Itau 97% CDI"], null],
  [["ZZZZ9"], null],
  [[""], null],
];

let ok = 0;
const falhas = [];
for (const [textos, esperado] of CASOS) {
  const achado = resolverAtivo(...textos);
  const obtido = achado ? `${achado.card}/${achado.segmento}` : null;
  if (obtido === esperado) ok++;
  else falhas.push(`  ✗ ${JSON.stringify(textos)}\n      esperado: ${esperado}\n      obtido:   ${obtido}`);
}

console.log(`catálogo: ${CATALOGO_TOTAL} tickers`);
console.log(`busca:    ${ok}/${CASOS.length} casos`);
if (falhas.length) console.log(falhas.join("\n"));

// segmentoNoCard só preenche quando o ticker pertence ao card do campo — é o
// que impede um segmento de Ações de entrar num ativo de FII.
const cruzados = [
  ["acoes", "PETR4", "Petróleo, Gás e Biocombustíveis"],
  ["fiis", "PETR4", null],
  ["exterior", "QQQM", "ETF RV"],
  ["acoes", "QQQM", null],
];
let okCruz = 0;
for (const [card, nome, esperado] of cruzados) {
  const obtido = segmentoNoCard(card, nome);
  if (obtido === esperado) okCruz++;
  else console.log(`  ✗ segmentoNoCard(${card}, ${nome}) → ${obtido}, esperado ${esperado}`);
}
console.log(`card cruzado: ${okCruz}/${cruzados.length} casos`);

console.log(`\nautocomplete "HGL" em fiis:  ${sugerirAtivos("HGL", "fiis").map((s) => s.ticker).join(", ")}`);
console.log(`autocomplete "PET" em acoes: ${sugerirAtivos("PET", "acoes").map((s) => s.ticker).join(", ")}`);

if (falhas.length || okCruz !== cruzados.length) process.exitCode = 1;
