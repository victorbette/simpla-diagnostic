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
      planoAcaoCount: 7,
      totalAportes: 218_000,
      totalResgates: 130_000,
      macroAtual: { resgate_longo: 62.5, resgate_rapido: 0, acoes: 12.5, fiis: 8.3, exterior: 10.4, cripto: 6.3 },
      macroMeta:  { resgate_longo: 41,   resgate_rapido: 25, acoes: 13,  fiis: 7,   exterior: 13,   cripto: 1 },
      planoAcao: [
        { id: "pa-1", card: "resgate_longo",  segmento: "Inflação",       nomeAtivo: "Tesouro IPCA+ 2045",   acao: "aportar",          valorAtualBRL: 100_000, valorMetaBRL: 180_000, movimentacaoBRL: 80_000,   prioridade: "alta" },
        { id: "pa-2", card: "resgate_longo",  segmento: "Pós-fixado",     nomeAtivo: "CDB Itau",             acao: "resgatar_total",   valorAtualBRL: 100_000, valorMetaBRL: 0,       movimentacaoBRL: -100_000, prioridade: "alta", observacao: "Taxa abaixo do mercado" },
        { id: "pa-3", card: "resgate_longo",  segmento: "Pós-fixado",     nomeAtivo: "LCI Sicoob",           acao: "manter",           valorAtualBRL: 100_000, valorMetaBRL: 100_000, movimentacaoBRL: 0,        prioridade: "media", observacao: "Manter por conta da taxa" },
        { id: "pa-4", card: "resgate_rapido", segmento: "Pós-fixado",     nomeAtivo: "Tesouro Selic",        acao: "novo",             valorAtualBRL: 0,       valorMetaBRL: 120_000, movimentacaoBRL: 120_000,  prioridade: "alta" },
        { id: "pa-5", card: "acoes",          segmento: "",               nomeAtivo: "BOVA11",               acao: "aportar",          valorAtualBRL: 60_000,  valorMetaBRL: 62_400,  movimentacaoBRL: 2_400,    prioridade: "media" },
        { id: "pa-6", card: "fiis",           segmento: "",               nomeAtivo: "HGLG11",               acao: "resgatar_parcial", valorAtualBRL: 40_000,  valorMetaBRL: 33_600,  movimentacaoBRL: -6_400,   prioridade: "baixa", valorResgateBRL: 6_400 },
        { id: "pa-7", card: "exterior",       segmento: "Renda Variável", nomeAtivo: "VOO",                  acao: "aportar",          valorAtualBRL: 50_000,  valorMetaBRL: 62_400,  movimentacaoBRL: 12_400,   prioridade: "media" },
        { id: "pa-8", card: "cripto",         segmento: "",               nomeAtivo: "HODL11",               acao: "resgatar_parcial", valorAtualBRL: 30_000,  valorMetaBRL: 4_800,   movimentacaoBRL: -25_200,  prioridade: "baixa", valorResgateBRL: 25_200 },
      ],
      ativosRecomendados: [
        { id: "ar-1", card: "resgate_longo",  nome: "Tesouro IPCA+ 2045", segmento: "Inflação",       vencimento: "2045-05-15", valorBRL: 180_000 },
        { id: "ar-2", card: "resgate_longo",  nome: "LCI Sicoob",         segmento: "Pós-fixado",     vencimento: "2028-03-01", valorBRL: 100_000 },
        { id: "ar-3", card: "resgate_rapido", nome: "Tesouro Selic",      segmento: "Pós-fixado",     valorBRL: 120_000 },
        { id: "ar-4", card: "acoes",          nome: "BOVA11",             segmento: "",               valorBRL: 62_400 },
        { id: "ar-5", card: "fiis",           nome: "HGLG11",             segmento: "",               valorBRL: 33_600 },
        { id: "ar-6", card: "exterior",       nome: "VOO",                segmento: "Renda Variável", valorBRL: 62_400 },
        { id: "ar-7", card: "cripto",         nome: "HODL11",             segmento: "",               valorBRL: 4_800 },
      ],
      aporteDisponivel: 0,
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
      capitalNecessario: 1_890_000,
      capitalAtual: 500_000,
      capitalImediato: 250_000,
      capitalContinuo: 1_200_000,
      capitalFilhos: 340_000,
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
      inputRendaAnualBruta: 420_000,
      inputDespesas: 24_000,
      inputDependentes: 2,
      inputAporteAnualPGBL: 35_000,
    },
    proximosPassos: [
      { id: "pp-1", descricao: "Contratar seguro de vida para cobrir o gap de proteção identificado", prioridade: "alta",  dataPrevisao: "2026-08", area: "Proteção e Sucessão" },
      { id: "pp-2", descricao: "Avaliar constituição de holding patrimonial com assessoria jurídica",  prioridade: "alta",  dataPrevisao: "2026-10", area: "Proteção e Sucessão" },
      { id: "pp-3", descricao: "Agendar próxima reunião de revisão da estratégia",                     prioridade: "baixa", dataPrevisao: "2027-01", area: "Geral" },
    ],
  };
}

/* Reproduz a casca estrutural da FinancialPlanningPage (header + abas +
 * <main> com as mesmas classes) para o preview imprimir igual à produção. */
function PreviewShell() {
  return (
    <div className="fp-print-root" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <header style={{ backgroundColor: "#1E3A8A", flexShrink: 0, height: 56, display: "flex", alignItems: "center", padding: "0 24px", color: "white", fontSize: 14 }}>
        Simpla Invest · Financial Planning (preview)
      </header>
      <div className="no-print" style={{ backgroundColor: "white", borderBottom: "1px solid #E5E7EB", padding: "0 24px", height: 44, display: "flex", alignItems: "center", fontSize: 13, color: "#6B7280", flexShrink: 0 }}>
        [barra de abas do preview]
      </div>
      <main className="fp-print-main" style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <EstrategiaFinal
          plan={mockPlan()}
          resultados={mockResultados()}
          clientName={CLIENTE}
        />
      </main>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<PreviewShell />);
}
