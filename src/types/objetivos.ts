export type TipoObjetivo =
  | 'viagem'
  | 'veiculo'
  | 'casa'
  | 'familia'
  | 'eletronico'
  | 'educacao'
  | 'hobby'
  | 'profissional'
  | 'saude'
  | 'outro'
  | 'aportes_financeiros';

export interface ObjetivoMeta {
  label: string;
  icone: string;   // lucide component name
  cor: string;
}

export const COR_OBJETIVO = '#2563EB';

export const OBJETIVO_META: Record<TipoObjetivo, ObjetivoMeta> = {
  viagem:              { label: 'Viagem',       icone: 'Plane',          cor: COR_OBJETIVO },
  veiculo:             { label: 'Veículo',      icone: 'Car',            cor: COR_OBJETIVO },
  casa:                { label: 'Casa',         icone: 'Home',           cor: COR_OBJETIVO },
  familia:             { label: 'Família',      icone: 'Heart',          cor: COR_OBJETIVO },
  eletronico:          { label: 'Eletrônico',   icone: 'Monitor',        cor: COR_OBJETIVO },
  educacao:            { label: 'Educação',     icone: 'BookOpen',       cor: COR_OBJETIVO },
  hobby:               { label: 'Hobby',        icone: 'Star',           cor: COR_OBJETIVO },
  profissional:        { label: 'Profissional', icone: 'Briefcase',      cor: COR_OBJETIVO },
  saude:               { label: 'Saúde',        icone: 'Shield',         cor: COR_OBJETIVO },
  outro:               { label: 'Outro',        icone: 'MoreHorizontal', cor: COR_OBJETIVO },
  aportes_financeiros: { label: 'Aportes',      icone: 'TrendingUp',     cor: COR_OBJETIVO },
};



export function getObjetivoMeta(tipo: string): ObjetivoMeta {
  return OBJETIVO_META[tipo as TipoObjetivo] ?? {
    label: 'Objetivo',
    icone: 'Star',
    cor: COR_OBJETIVO,
  };
}

export interface ObjetivoVida {
  id: string;
  tipo: TipoObjetivo;
  label: string;
  mes: number;    // 1-12
  ano: number;    // calendar year
  valorBRL: number;
  ativo?: boolean;          // undefined = active (backwards compatible)
  tipoFluxo?: 'saida' | 'entrada'; // undefined = saida (backwards compatible)
}

/** Returns true when the objective adds capital (entrada) to the patrimônio */
export function isEntradaObjetivo(obj: ObjetivoVida): boolean {
  return obj.tipoFluxo === 'entrada' || obj.tipo === 'aportes_financeiros';
}
