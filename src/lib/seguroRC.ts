export interface InfoSeguroRC {
  recomendado: boolean;
  categoria: string;
  titulo: string;
  descricao: string;
  icone: string;
}

const PROFISSOES_RC: Array<{
  palavras: string[];
  categoria: string;
  titulo: string;
  descricao: string;
  icone: string;
}> = [
  {
    palavras: [
      "médico", "medico", "médica", "medica",
      "dentista", "odontólogo", "odontologo",
      "cirurgião", "cirurgiao", "ortopedista",
      "cardiologista", "pediatra", "ginecologista",
      "psiquiatra", "dermatologista", "neurologista",
    ],
    categoria: "Saúde",
    titulo: "Seguro de Responsabilidade Civil Profissional — Área da Saúde",
    descricao:
      "Protege contra alegações de erros médicos, falhas em procedimentos, imperícia ou negligência. Essencial para profissionais da saúde que realizam procedimentos e podem ser alvo de processos por danos causados a pacientes.",
    icone: "ti-stethoscope",
  },
  {
    palavras: [
      "advogado", "advogada", "jurídico", "juridico",
      "consultor jurídico", "consultor juridico",
      "procurador", "promotor", "defensor",
    ],
    categoria: "Jurídico",
    titulo: "Seguro de Responsabilidade Civil Profissional — Área Jurídica",
    descricao:
      "Ampara financeiramente em casos de perda de prazos, erros em contratos ou orientações que gerem prejuízos aos clientes. Protege o patrimônio pessoal do profissional em ações por danos causados no exercício da advocacia ou consultoria.",
    icone: "ti-gavel",
  },
];

export function detectarSeguroRC(profissao: string): InfoSeguroRC {
  if (!profissao?.trim()) {
    return { recomendado: false, categoria: "", titulo: "", descricao: "", icone: "" };
  }

  const profissaoLower = profissao.toLowerCase().trim();

  for (const grupo of PROFISSOES_RC) {
    const match = grupo.palavras.some((p) => profissaoLower.includes(p));
    if (match) {
      return {
        recomendado: true,
        categoria: grupo.categoria,
        titulo: grupo.titulo,
        descricao: grupo.descricao,
        icone: grupo.icone,
      };
    }
  }

  return { recomendado: false, categoria: "", titulo: "", descricao: "", icone: "" };
}
