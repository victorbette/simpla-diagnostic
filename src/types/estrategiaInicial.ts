export interface SecaoEstrategia {
  id: string;
  titulo: string;
  conteudoConsultor: string;
  dados: Record<string, unknown>;
  completa: boolean;
}

export interface EstrategiaInicial {
  id?: string;
  clientId: string;
  financialPlanId?: string;
  createdAt?: string;
  updatedAt?: string;
  logoUrl?: string;
  logoBase64?: string;
  apresentacao: string;
  nomeConsultor: string;
  secoes: {
    assetAllocation: SecaoEstrategia;
    aposentadoria: SecaoEstrategia;
    protecao: SecaoEstrategia;
    fiscal: SecaoEstrategia;
    sucessorio: SecaoEstrategia;
    proximosPassos: SecaoEstrategia;
  };
  status: 'rascunho' | 'completo';
}

export function initialSecao(id: string, titulo: string): SecaoEstrategia {
  return { id, titulo, conteudoConsultor: '', dados: {}, completa: false };
}

export function initialEstrategia(clientId: string, financialPlanId?: string): EstrategiaInicial {
  return {
    clientId,
    financialPlanId,
    apresentacao: '',
    nomeConsultor: '',
    secoes: {
      assetAllocation: initialSecao('assetAllocation', 'Asset Allocation'),
      aposentadoria: initialSecao('aposentadoria', 'Aposentadoria / IF'),
      protecao: initialSecao('protecao', 'Proteção'),
      fiscal: initialSecao('fiscal', 'Planejamento Fiscal'),
      sucessorio: initialSecao('sucessorio', 'Planejamento Sucessório'),
      proximosPassos: initialSecao('proximosPassos', 'Próximos Passos'),
    },
    status: 'rascunho',
  };
}
