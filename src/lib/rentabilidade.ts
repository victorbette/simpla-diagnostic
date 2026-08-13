export type PerfilInvestidor =
  | "conservador"
  | "conservador_moderado"
  | "moderado"
  | "arrojado";

interface FaixaRentabilidade {
  patrimonioMin: number;
  patrimonioMax: number;
  perfil: PerfilInvestidor;
  taxaAnual: number; // % real a.a. (ex: 6.36 = IPCA+6,36%)
}

const TABELA: FaixaRentabilidade[] = [
  // 100k – 149,9k
  { patrimonioMin: 100_000,   patrimonioMax: 149_999,   perfil: "conservador",          taxaAnual: 6.34 },
  { patrimonioMin: 100_000,   patrimonioMax: 149_999,   perfil: "moderado",             taxaAnual: 6.41 },
  { patrimonioMin: 100_000,   patrimonioMax: 149_999,   perfil: "arrojado",             taxaAnual: 6.51 },
  // 150k – 349,9k
  { patrimonioMin: 150_000,   patrimonioMax: 349_999,   perfil: "conservador",          taxaAnual: 6.28 },
  { patrimonioMin: 150_000,   patrimonioMax: 349_999,   perfil: "moderado",             taxaAnual: 6.27 },
  { patrimonioMin: 150_000,   patrimonioMax: 349_999,   perfil: "arrojado",             taxaAnual: 6.22 },
  // 350k – 999,9k
  { patrimonioMin: 350_000,   patrimonioMax: 999_999,   perfil: "conservador",          taxaAnual: 6.32 },
  { patrimonioMin: 350_000,   patrimonioMax: 999_999,   perfil: "conservador_moderado", taxaAnual: 6.34 },
  { patrimonioMin: 350_000,   patrimonioMax: 999_999,   perfil: "moderado",             taxaAnual: 6.36 },
  { patrimonioMin: 350_000,   patrimonioMax: 999_999,   perfil: "arrojado",             taxaAnual: 6.47 },
  // 1M – 4,9M
  { patrimonioMin: 1_000_000, patrimonioMax: 4_999_999, perfil: "conservador",          taxaAnual: 6.21 },
  { patrimonioMin: 1_000_000, patrimonioMax: 4_999_999, perfil: "conservador_moderado", taxaAnual: 6.21 },
  { patrimonioMin: 1_000_000, patrimonioMax: 4_999_999, perfil: "moderado",             taxaAnual: 6.12 },
  { patrimonioMin: 1_000_000, patrimonioMax: 4_999_999, perfil: "arrojado",             taxaAnual: 6.06 },
  // 5M – 9,9M
  { patrimonioMin: 5_000_000, patrimonioMax: 9_999_999, perfil: "conservador",          taxaAnual: 6.21 },
  { patrimonioMin: 5_000_000, patrimonioMax: 9_999_999, perfil: "conservador_moderado", taxaAnual: 6.16 },
  { patrimonioMin: 5_000_000, patrimonioMax: 9_999_999, perfil: "moderado",             taxaAnual: 6.10 },
  { patrimonioMin: 5_000_000, patrimonioMax: 9_999_999, perfil: "arrojado",             taxaAnual: 6.09 },
  // 10M+
  { patrimonioMin: 10_000_000, patrimonioMax: Infinity,  perfil: "conservador",          taxaAnual: 6.17 },
  { patrimonioMin: 10_000_000, patrimonioMax: Infinity,  perfil: "conservador_moderado", taxaAnual: 6.15 },
  { patrimonioMin: 10_000_000, patrimonioMax: Infinity,  perfil: "moderado",             taxaAnual: 6.08 },
  { patrimonioMin: 10_000_000, patrimonioMax: Infinity,  perfil: "arrojado",             taxaAnual: 6.11 },
];

function normalizarPerfil(perfil: string): PerfilInvestidor {
  const map: Record<string, PerfilInvestidor> = {
    conservador: "conservador",
    conservador_moderado: "conservador_moderado",
    conservadormoderado: "conservador_moderado",
    moderado: "moderado",
    arrojado: "arrojado",
    agressivo: "arrojado",
  };
  const chave = (perfil ?? "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z_]/g, "");
  return map[chave] ?? "moderado";
}

export function getTaxaRentabilidade(patrimonio: number, perfil: string): number {
  const perfilNorm = normalizarPerfil(perfil);
  const entrada = TABELA.find(
    (r) => patrimonio >= r.patrimonioMin && patrimonio <= r.patrimonioMax && r.perfil === perfilNorm,
  );
  if (entrada) return entrada.taxaAnual;

  // Fallback: qualquer entrada da faixa patrimonial
  const faixaFallback = TABELA.find(
    (r) => patrimonio >= r.patrimonioMin && patrimonio <= r.patrimonioMax,
  );
  return faixaFallback?.taxaAnual ?? 6.30;
}

export function formatarTaxaLabel(taxa: number): string {
  return `IPCA + ${taxa.toFixed(2).replace(".", ",")}%`;
}
