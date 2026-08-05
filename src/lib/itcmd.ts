export interface DadosITCMD {
  uf: string;
  estado: string;
  aliquota: number;
  tipo: 'fixa' | 'progressiva';
  observacao?: string;
}

export const TABELA_ITCMD: DadosITCMD[] = [
  { uf: 'AC', estado: 'Acre',               aliquota: 4, tipo: 'fixa' },
  { uf: 'AL', estado: 'Alagoas',            aliquota: 4, tipo: 'fixa' },
  { uf: 'AM', estado: 'Amazonas',           aliquota: 2, tipo: 'fixa' },
  { uf: 'AP', estado: 'Amapá',              aliquota: 4, tipo: 'fixa' },
  { uf: 'BA', estado: 'Bahia',              aliquota: 8, tipo: 'progressiva' },
  { uf: 'CE', estado: 'Ceará',              aliquota: 8, tipo: 'progressiva' },
  { uf: 'DF', estado: 'Distrito Federal',   aliquota: 6, tipo: 'progressiva' },
  { uf: 'ES', estado: 'Espírito Santo',     aliquota: 4, tipo: 'fixa' },
  { uf: 'GO', estado: 'Goiás',              aliquota: 4, tipo: 'fixa' },
  { uf: 'MA', estado: 'Maranhão',           aliquota: 7, tipo: 'progressiva' },
  { uf: 'MG', estado: 'Minas Gerais',       aliquota: 5, tipo: 'progressiva' },
  { uf: 'MS', estado: 'Mato Grosso do Sul', aliquota: 6, tipo: 'progressiva' },
  { uf: 'MT', estado: 'Mato Grosso',        aliquota: 8, tipo: 'progressiva' },
  { uf: 'PA', estado: 'Pará',               aliquota: 4, tipo: 'fixa' },
  { uf: 'PB', estado: 'Paraíba',            aliquota: 8, tipo: 'progressiva' },
  { uf: 'PE', estado: 'Pernambuco',         aliquota: 8, tipo: 'progressiva' },
  { uf: 'PI', estado: 'Piauí',              aliquota: 4, tipo: 'fixa' },
  { uf: 'PR', estado: 'Paraná',             aliquota: 4, tipo: 'fixa' },
  { uf: 'RJ', estado: 'Rio de Janeiro',     aliquota: 8, tipo: 'progressiva' },
  { uf: 'RN', estado: 'Rio Grande do Norte', aliquota: 6, tipo: 'progressiva' },
  { uf: 'RO', estado: 'Rondônia',           aliquota: 4, tipo: 'fixa' },
  { uf: 'RR', estado: 'Roraima',            aliquota: 4, tipo: 'fixa' },
  { uf: 'RS', estado: 'Rio Grande do Sul',  aliquota: 6, tipo: 'progressiva' },
  { uf: 'SC', estado: 'Santa Catarina',     aliquota: 8, tipo: 'progressiva' },
  { uf: 'SE', estado: 'Sergipe',            aliquota: 8, tipo: 'progressiva' },
  { uf: 'SP', estado: 'São Paulo',          aliquota: 4, tipo: 'fixa' },
  { uf: 'TO', estado: 'Tocantins',          aliquota: 4, tipo: 'fixa' },
];

export const getAliquotaITCMD = (uf: string): number => {
  const dado = TABELA_ITCMD.find(d => d.uf === uf?.toUpperCase());
  return dado?.aliquota ?? 4;
};
