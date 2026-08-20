// ============================================================================
// Gera src/lib/carteira/catalogoAtivos.gen.ts a partir de src/data/ativos.csv
// ----------------------------------------------------------------------------
// O CSV é a fonte da verdade (editável à mão, bom de diff). Este script traduz
// o vocabulário da planilha para o do app — classe → CardId e categoria →
// segmento válido do card — e emite um módulo TypeScript pronto, sem parse em
// runtime.
//
//   node scripts/gerarCatalogoAtivos.mjs
//
// Formato do CSV: TICKER,Classe,Categoria
//   - TICKER aceita equivalentes separados por "|" ("IVVB11 | VOO"): cada um
//     vira uma chave apontando para a mesma entrada.
//   - Classe: Ações | Fundos Imobiliários | Stocks | REITs | ETFs
//   - Categoria: setor/subtipo (ver tabelas de normalização abaixo).
//
// Rótulos de segmento desconhecidos NÃO são inventados: o script aborta e lista
// o que precisa ser decidido, para o catálogo nunca gerar um segmento que o
// dropdown da Etapa 1 não aceita.
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRADA = path.join(raiz, "src/data/ativos.csv");
const SAIDA = path.join(raiz, "src/lib/carteira/catalogoAtivos.gen.ts");

// ─── Normalização de categorias ──────────────────────────────────────────────
// Só funde grafias divergentes do mesmo setor (caixa, acento, typo, sinônimo
// direto). Setores realmente distintos ficam distintos — a granularidade da
// lista curada é intencional.

/** Ações: categoria do CSV → segmento canônico. Ausente = usa o próprio texto. */
const ACOES_ALIAS = {
  "SOFTWARE": "Software",
  "Programas e Serviços": "Software",
  "Químico": "Químicos",
  "Produtos Farmacêuticos": "Medicamentos",
  "Medicamentos e Outros Produtos": "Medicamentos",
  "Serviços Médicos": "Saúde",
  "Hospitais": "Saúde",
  "Shoppings": "Shopping",
  "Shopping Center": "Shopping",
  "Construção": "Construção Civil",
  "Construção Cívil": "Construção Civil",
  "Petróleo. Gás e Biocombustíveis": "Petróleo, Gás e Biocombustíveis",
  "Petróleo. Gás e Biocombustíveis.": "Petróleo, Gás e Biocombustíveis",
  "Automóveis e Motocicletas": "Automotivo",
  "Logística e Ferroviário": "Logística",
  "Logística e Rodoviário": "Logística",
};

/** FIIs: categoria do CSV → rótulo já usado pelo app, quando equivalente. */
const FIIS_ALIAS = {
  "Lajes corporativas": "Lajes Corp.",
  "Lajes Corporativas": "Lajes Corp.",
  "Galpões Logísticos": "Galpões Log.",
  "Galpões logísticos": "Galpões Log.",
  "Shopping Centers": "Shopping",
  "Fundo de fundos": "FOF",
  "Fundo de Fundos": "FOF",
};

/**
 * ETFs: a classe "ETFs" do CSV mistura três destinos. O que decide é o
 * mercado-alvo da categoria, não o ticker — BOVA11 é renda variável Brasil
 * mesmo sendo ETF, e HASH11 é cripto.
 */
const ETF_DESTINO = {
  "Índice Ibovespa": { card: "acoes", segmento: "ETF Brasil" },
  "ETF de Small Caps brasileiras": { card: "acoes", segmento: "ETF Brasil" },
  "ETF de empresas pagadoras de dividendos": { card: "acoes", segmento: "ETF Brasil" },
  "Criptomoeda": { card: "cripto", segmento: "ETF Cripto" },
  "Criptomoedas": { card: "cripto", segmento: "ETF Cripto" },
  "Renda Fixa EUA": { card: "exterior", segmento: "ETF RF" },
  // demais categorias (EUA *, Mundo, China, Emergentes, Metais Preciosos…)
  // caem no default abaixo.
};
const ETF_DEFAULT = { card: "exterior", segmento: "ETF RV" };

/**
 * Exterior direto: no card Exterior o segmento é o TIPO de instrumento, não o
 * setor — a categoria do CSV ("Technology", "Residential") vira `setor`, que o
 * catálogo guarda à parte.
 */
const CLASSE_DIRETA = {
  "Ações": { card: "acoes" },
  "Fundos Imobiliários": { card: "fiis" },
  "Stocks": { card: "exterior", segmento: "Stocks" },
  "REITs": { card: "exterior", segmento: "REITs" },
};

// Espelha SEGMENTOS_POR_CLASSE de src/lib/carteira/types.ts. Duplicado de
// propósito: o gerador é Node puro e não importa TS. Se as listas divergirem, a
// validação abaixo acusa.
const SEGMENTOS_VALIDOS = {
  acoes: [
    "Academias", "Agronegócio", "Alimentos", "Armas e Munições", "Automotivo",
    "Bancos", "Bebidas", "Bens Industriais", "Bolsa de Valores", "Calçados",
    "Comunicações", "Construção Civil", "Consumo Cíclico", "Educação", "Energia",
    "ETF Brasil", "Exploração de Imóveis", "Financeiro", "Gás", "Holding",
    "Locação - Máquinas e Equip.", "Locação de Veículos", "Logística",
    "Materiais Básicos", "Máquinas e Equipamentos", "Medicamentos", "Mineração",
    "Motores e Compressores", "Papel e Celulose", "Pet Shop",
    "Petróleo, Gás e Biocombustíveis", "Produtos de Uso Pessoal",
    "Produtos Diversos", "Químicos", "Saneamento", "Saúde", "Seguros",
    "Shopping", "Siderurgia", "Software", "Varejo", "Varejo Alimentício",
    "Diverso",
  ],
  fiis: [
    "Papel", "Recebíveis", "Híbrido", "Lajes Corp.", "Galpões Log.",
    "Galpões Industriais", "Shopping", "Fiagro", "Agronegócio", "FOF",
    "Hedge Fund", "FI-Infra", "Desenvolvimento",
  ],
  exterior: ["ETF RV", "ETF RF", "Stocks", "REITs", "Bonds", "Mutual Funds"],
  cripto: null, // texto livre no card
};

// ─── CSV ─────────────────────────────────────────────────────────────────────

/** Parser mínimo com suporte a campo entre aspas ("Petróleo, Gás e ..."). */
function parseLinha(linha) {
  const campos = [];
  let atual = "";
  let dentroDeAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (dentroDeAspas) {
      if (ch === '"') {
        if (linha[i + 1] === '"') { atual += '"'; i++; } else dentroDeAspas = false;
      } else atual += ch;
    } else if (ch === '"') dentroDeAspas = true;
    else if (ch === ",") { campos.push(atual); atual = ""; }
    else atual += ch;
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

function lerCsv() {
  const bruto = fs.readFileSync(ENTRADA, "utf8").replace(/^﻿/, "");
  const linhas = bruto.split(/\r?\n/).filter((l) => l.trim());
  return linhas.slice(1).map(parseLinha).map((c, i) => ({ linha: i + 2, campos: c }));
}

// ─── Tradução ────────────────────────────────────────────────────────────────

function resolver(classe, categoria) {
  if (classe === "ETFs") {
    const d = ETF_DESTINO[categoria] ?? ETF_DEFAULT;
    return { card: d.card, segmento: d.segmento, setor: categoria };
  }
  const direta = CLASSE_DIRETA[classe];
  if (!direta) return null;
  if (direta.segmento) {
    // Exterior: segmento é o instrumento; a categoria vira setor informativo.
    return { card: direta.card, segmento: direta.segmento, setor: categoria };
  }
  const alias = direta.card === "acoes" ? ACOES_ALIAS : FIIS_ALIAS;
  return { card: direta.card, segmento: alias[categoria] ?? categoria, setor: "" };
}

// ─── Execução ────────────────────────────────────────────────────────────────

const linhas = lerCsv();
const entradas = new Map(); // ticker → { card, segmento, setor }
const problemas = [];
const conflitos = [];

for (const { linha, campos } of linhas) {
  const [tickersBrutos, classe, categoria] = campos;
  if (campos.length !== 3) {
    problemas.push(`linha ${linha}: esperava 3 colunas, veio ${campos.length}`);
    continue;
  }
  const destino = resolver(classe, categoria);
  if (!destino) {
    problemas.push(`linha ${linha}: classe desconhecida "${classe}"`);
    continue;
  }
  const validos = SEGMENTOS_VALIDOS[destino.card];
  if (validos && !validos.includes(destino.segmento)) {
    problemas.push(
      `linha ${linha}: segmento "${destino.segmento}" (de "${categoria}") não existe em SEGMENTOS_POR_CLASSE.${destino.card}`,
    );
    continue;
  }

  for (const ticker of tickersBrutos.split("|").map((t) => t.trim()).filter(Boolean)) {
    const chave = ticker.toUpperCase();
    const anterior = entradas.get(chave);
    if (anterior && (anterior.card !== destino.card || anterior.segmento !== destino.segmento)) {
      conflitos.push(
        `${chave}: ${anterior.card}/${anterior.segmento} (linha ${anterior.linha}) vs ${destino.card}/${destino.segmento} (linha ${linha})`,
      );
      continue;
    }
    if (!anterior) entradas.set(chave, { ...destino, linha });
  }
}

if (problemas.length || conflitos.length) {
  console.error("Catálogo NÃO gerado — resolva antes:\n");
  for (const p of problemas) console.error("  ✗ " + p);
  for (const c of conflitos) console.error("  ✗ conflito " + c);
  process.exit(1);
}

const ordenadas = [...entradas.entries()].sort(([a], [b]) => a.localeCompare(b));
const esc = (s) => JSON.stringify(s);

const corpo = ordenadas
  .map(([ticker, e]) => `  ${esc(ticker)}: [${esc(e.card)}, ${esc(e.segmento)}${e.setor ? `, ${esc(e.setor)}` : ""}],`)
  .join("\n");

const saida = `// ⚠️ ARQUIVO GERADO — não edite à mão.
// Fonte: src/data/ativos.csv · Gerar: node scripts/gerarCatalogoAtivos.mjs
//
// Tupla por ticker: [card, segmento, setor?]. O setor só existe para Exterior,
// onde o segmento é o tipo de instrumento (Stocks/REITs/ETF RV) e o setor
// original da lista ("Technology", "Residential") vira informação de apoio.

import type { CardId } from "./types";

export type EntradaCatalogo = readonly [card: CardId, segmento: string, setor?: string];

export const CATALOGO_ATIVOS: Readonly<Record<string, EntradaCatalogo>> = {
${corpo}
};

export const CATALOGO_TOTAL = ${ordenadas.length};
`;

fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
fs.writeFileSync(SAIDA, saida, "utf8");

const porCard = {};
for (const [, e] of ordenadas) porCard[e.card] = (porCard[e.card] ?? 0) + 1;

console.log(`✓ ${path.relative(raiz, SAIDA)}`);
console.log(`  ${linhas.length} linhas do CSV → ${ordenadas.length} tickers`);
console.log(`  ${Object.entries(porCard).map(([c, n]) => `${c}: ${n}`).join(" · ")}`);
