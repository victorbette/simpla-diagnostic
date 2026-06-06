export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const parseBRL = (s: string) => {
  const cleaned = s.replace(/[^\d,]/g, "").replace(",", ".");
  return Math.max(0, parseFloat(cleaned) || 0);
};

export const formatInputBRL = (v: number) => {
  if (v === 0) return "";
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const DEDUCAO_DEPENDENTE = 2275.08;

// Tabela progressiva anual IRPF 2025
const faixasAnuais = [
  { limite: 28467.20,  aliquota: 0,     deduzir: 0        },
  { limite: 33919.80,  aliquota: 0.075, deduzir: 2135.04  },
  { limite: 45012.60,  aliquota: 0.15,  deduzir: 4679.03  },
  { limite: 55976.16,  aliquota: 0.225, deduzir: 8054.97  },
  { limite: Infinity,  aliquota: 0.275, deduzir: 10853.78 },
];

export function calcularIRAnual(baseCalculo: number): number {
  if (baseCalculo <= 0) return 0;
  for (const f of faixasAnuais) {
    if (baseCalculo <= f.limite) {
      return Math.max(0, baseCalculo * f.aliquota - f.deduzir);
    }
  }
  return 0;
}

// Tabela INSS 2025 (progressiva)
const faixasINSS = [
  { ate: 1518.00,  aliquota: 0.075 },
  { ate: 2793.88,  aliquota: 0.09  },
  { ate: 4190.83,  aliquota: 0.12  },
  { ate: 8157.41,  aliquota: 0.14  },
  { ate: Infinity, aliquota: 0.14  },
];
const TETO_INSS = 908.86;

export function calcularINSSMensal(
  rendaMensal: number,
  tipoTrabalho = ""
): number {
  if (["autonomo", "empresario"].includes(tipoTrabalho)) return 0;
  let inss = 0;
  let base = 0;
  for (const f of faixasINSS) {
    if (rendaMensal <= base) break;
    const topo = Math.min(rendaMensal, f.ate);
    inss += (topo - base) * f.aliquota;
    base = f.ate;
    if (rendaMensal <= f.ate) break;
  }
  return Math.min(inss, TETO_INSS);
}
