export type TipoObjetivo =
  | 'imovel'
  | 'veiculo'
  | 'educacao'
  | 'viagem'
  | 'negocio'
  | 'reforma'
  | 'casamento'
  | 'filhos'
  | 'emergencia'
  | 'outro_aporte'
  | 'outro_despesa';

export interface ObjetivoMeta {
  label: string;
  iconName: string;
  color: string;
  tipo: 'despesa' | 'aporte';
}

export const OBJETIVO_META: Record<TipoObjetivo, ObjetivoMeta> = {
  imovel:        { label: "Imóvel",       iconName: "Home",          color: "#1E40AF", tipo: "despesa" },
  veiculo:       { label: "Veículo",      iconName: "Car",           color: "#7C3AED", tipo: "despesa" },
  educacao:      { label: "Educação",     iconName: "BookOpen",      color: "#0369A1", tipo: "despesa" },
  viagem:        { label: "Viagem",       iconName: "Plane",         color: "#0891B2", tipo: "despesa" },
  negocio:       { label: "Negócio",      iconName: "Briefcase",     color: "#15803D", tipo: "despesa" },
  reforma:       { label: "Reforma",      iconName: "Hammer",        color: "#B45309", tipo: "despesa" },
  casamento:     { label: "Casamento",    iconName: "Heart",         color: "#DB2777", tipo: "despesa" },
  filhos:        { label: "Filhos",       iconName: "Baby",          color: "#9D174D", tipo: "despesa" },
  emergencia:    { label: "Reserva",      iconName: "Shield",        color: "#B91C1C", tipo: "despesa" },
  outro_aporte:  { label: "Aporte extra", iconName: "TrendingUp",    color: "#15803D", tipo: "aporte"  },
  outro_despesa: { label: "Outro",        iconName: "MoreHorizontal",color: "#6B7280", tipo: "despesa" },
};

export interface ObjetivoVida {
  id: string;
  tipo: TipoObjetivo;
  label: string;    // nome customizado do objetivo
  mes: number;      // 1-12
  ano: number;      // ano calendário (ex: 2031)
  valorBRL: number;
}
