export interface NivelScore {
  label: string;
  cor: string;
  bg: string;
}

export function nivelScore(score: number): NivelScore {
  if (score < 0)
    return { label: "Não avaliado",       cor: "#9CA3AF", bg: "#F3F4F6" };
  if (score <= 30)
    return { label: "Crítico",            cor: "#B91C1C", bg: "#FEE2E2" };
  if (score <= 50)
    return { label: "Atenção Urgente",    cor: "#C2410C", bg: "#FFEDD5" };
  if (score <= 90)
    return { label: "Precisa Desenvolver", cor: "#B45309", bg: "#FEF3C7" };
  return   { label: "Caminho Certo",      cor: "#15803D", bg: "#DCFCE7" };
}
