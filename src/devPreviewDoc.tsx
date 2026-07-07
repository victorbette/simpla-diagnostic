/* Preview de desenvolvimento do documento "Estratégia Inicial" com dados
 * fictícios — abrir /preview-doc.html no dev server (não entra no build). */
import { createRoot } from "react-dom/client";
import { EstrategiaFinal } from "@/components/estrategia/EstrategiaFinal";
import { initialFinancialPlan } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { calcularProjecaoIF } from "@/lib/financialFreedomCalc";
import type { ObjetivoVida } from "@/types/objetivos";
import "./index.css";

const CLIENTE = "Carlos Eduardo Mendes";

const objetivos: ObjetivoVida[] = [
  { id: "obj-1", tipo: "viagem", label: "Viagem USA", mes: 6, ano: 2032, valorBRL: 100_000 },
  { id: "obj-2", tipo: "casa", label: "Casa Nova", mes: 1, ano: 2035, valorBRL: 500_000 },
];

function mockPlan(): FinancialPlan {
  const plan = initialFinancialPlan("preview-cliente");
  plan.dadosCliente = {
    ...plan.dadosCliente,
    dataNascimento: "1984-03-15",
    estadoCivil: "casado",
    temFilhos: true,
    numeroFilhos: 2,
    filhos: [
      { nome: "Ana", idade: 10 },
      { nome: "Pedro", idade: 7 },
    ],
    profissao: "Médico",
    tipoTrabalho: "autonomo",
    rendaMensal: 35_000,
    custoDeVidaMensal: 18_000,
    aportesMensalMedio: 8_000,
    patrimonioTotalEstimado: 1_200_000,
    patrimonioFinanceiroEstimado: 480_000,
    possuiImoveis: true,
    quantidadeImoveis: 2,
    suitabilityPerfil: "moderado",
  };
  plan.ativosAtuais = {
    rendaFixa: 300_000,
    acoes: 60_000,
    fiis: 40_000,
    rvGlobal: 50_000,
    rfGlobal: 0,
    cripto: 30_000,
    total: 480_000,
  };
  plan.planejamentoIF = {
    ...plan.planejamentoIF,
    idadeAtual: 42,
    idadeMeta: 60,
    rendaMensalDesejada: 25_000,
    patrimonioAtual: 480_000,
    aporteMensal: 8_000,
    taxaRetornoAnual: 6,
  };
  plan.protecao = {
    ...plan.protecao,
    rendaMensal: 35_000,
    possuiSeguroVida: true,
    capitalSeguradoVida: 500_000,
    possuiSeguroInvalidez: false,
    possuiPlanoSaude: true,
    dependentes: 2,
  };
  plan.fiscal = {
    ...plan.fiscal,
    rendaBrutaAnual: 420_000,
    tipoDeclaracao: "completa",
    temPGBL: true,
    valorPGBLAnual: 35_000,
    temRendimentosIsentos: true,
    tiposRendimentosIsentos: ["Dividendos", "LCI/LCA"],
  };
  plan.sucessorio = {
    ...plan.sucessorio,
    patrimonioTotal: 1_200_000,
    numeroHerdeiros: 2,
    estadoResidencia: "SP",
    seguroComBeneficiario: true,
    previdenciaComBeneficiario: true,
  };
  return plan;
}

function mockResultados(): ResultadosEstrategia {
  const agora = new Date().toISOString();
  const proj = calcularProjecaoIF({
    idadeAtual: 42,
    idadeMeta: 60,
    idadeMaxima: 90,
    patrimonioInicial: 480_000,
    aporteMensal: 8_000,
    rendaMensalDesejada: 25_000,
    taxaRetornoAnual: 0.06,
    anoNascimento: 1984,
    mesNascimento: 3,
    objetivos,
  });

  return {
    carteira: {
      patrimonio: 480_000,
      planoAcaoCount: 4,
      totalAportes: 168_000,
      totalResgates: 168_000,
      macroAtual: {},
      macroMeta: {},
      planoAcao: [
        { id: "pa-1", nomeAtivo: "Tesouro IPCA+ 2045", acao: "aportar", valorAtualBRL: 0, valorMetaBRL: 80_000, movimentacaoBRL: 80_000 },
        { id: "pa-2", nomeAtivo: "CDB Liquidez Diária", acao: "resgatar", valorAtualBRL: 200_000, valorMetaBRL: 100_000, movimentacaoBRL: -100_000 },
        { id: "pa-3", nomeAtivo: "ETF IVVB11 (S&P 500)", acao: "aportar", valorAtualBRL: 50_000, valorMetaBRL: 88_000, movimentacaoBRL: 38_000 },
        { id: "pa-4", nomeAtivo: "FII HGLG11", acao: "manter", valorAtualBRL: 40_000, valorMetaBRL: 40_000, movimentacaoBRL: 0 },
      ],
      dataCalculo: agora,
      savedAt: agora,
    },
    if: {
      patrimonioAposentadoria: proj.patrimonioNaIF,
      rendaSustentavel: proj.rendaSustentavel,
      gapRenda: proj.gapRenda,
      liberdadeAlcancada: proj.ifAlcancada,
      aporteAjustado: proj.aporteNecessario,
      patrimonioNecessario: proj.patrimonioNecessario,
      patrimonioAtual: 480_000,
      idadeAtual: 42,
      idadeMeta: 60,
      anosRestantes: 18,
      rendaMensalDesejada: 25_000,
      aporteAtual: 8_000,
      taxaRetorno: 0.06,
      projecao: proj.projecao,
      curvaIdeal: proj.curvaIdeal,
      objetivos,
      anoNascimento: 1984,
      mesNascimento: 3,
      mesInicioRetirada: proj.mesInicioRetirada,
      dataCalculo: agora,
      savedAt: agora,
    },
    seguro: {
      totalNeed: 1_890_000,
      totalCoverage: 500_000,
      gap: 1_390_000,
      scoreProtecao: 40,
      temSeguroVida: true,
      temSeguroInvalidez: false,
      immediateTotal: 250_000,
      ongoingTotal: 1_200_000,
      educationTotal: 340_000,
      lifestyleTotal: 100_000,
      inventoryCost: 120_000,
      disabilityTotal: 800_000,
      disabilityGap: 800_000,
      disabilityCoverage: 0,
      criticalIllnessTotal: 300_000,
      criticalIllnessGap: 300_000,
      criticalIllnessCoverage: 0,
      dataCalculo: agora,
      savedAt: agora,
    },
    fiscal: {
      rendaAnual: 420_000,
      tetoPGBLAnual: 50_400,
      aporteAnual: 35_000,
      irComPGBL: 88_000,
      irSemPGBL: 92_225,
      economiaAnual: 4_225,
      espacoDisponivelMensal: 1_283,
      aproveitandoTeto: false,
      dataCalculo: agora,
      savedAt: agora,
    },
  };
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <EstrategiaFinal
      plan={mockPlan()}
      resultados={mockResultados()}
      clientName={CLIENTE}
    />,
  );
}
