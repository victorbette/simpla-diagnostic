import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip,
  CartesianGrid, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList,
} from "recharts";
import type { FinancialPlan } from "@/types/financialPlanning";
import { formatBRL } from "@/lib/tax";
import { calcularResultadoPgbl, compararModelosDeclaracao, type EntradaPgbl } from "@/lib/tributario/pgbl";
import { DEDUCAO_DEPENDENTE_ANUAL, REDUTOR_2026_ISENCAO_ATE, LIMITE_DESPESA_INSTRUCAO_ANUAL_POR_PESSOA } from "@/lib/tributario/irpf";
import type { TipoDeclaracao } from "@/lib/tributario/types";
import { useCurrencyInput } from "@/hooks/useCurrencyInput";
import { PainelAjuda } from "@/components/shared/PainelAjuda";

export interface SavedPGBLResult {
  tipoDeclaracao?: string;
  rendaAnual: number;
  tetoPGBLAnual: number;
  aporteAnual: number;
  irComPGBL: number;
  irSemPGBL: number;
  economiaAnual: number;
  espacoDisponivelMensal: number;
  aproveitandoTeto: boolean;
  irRetidoFonte?: number;
  saldoSemPGBL?: number;
  saldoComPGBL?: number;
  inputRendaAnualBruta?: number;
  inputInssPago?: number;
  inputDespesasMedicas?: number;
  inputDespesasInstrucao?: number;
  inputPensaoAlimenticia?: number;
  inputDependentes?: number;
  inputAporteAnualPGBL?: number;
  inputIrRetidoFonte?: number;
  inputSaldoPrevidencia?: number;
  inputDespesas?: number;  // legacy
  analisado?: boolean;
  dataUltimoSalvamento?: string;
}

interface Props {
  plan: FinancialPlan;
  clientName?: string;
  onClose?: () => void;
  onSave?: (r: SavedPGBLResult) => void;
  savedResult?: SavedPGBLResult | null;
}

const TIPOS_DECLARACAO = [
  { id: "completa",     label: "Completa",    descricao: "Deduz INSS, saúde, educação, dependentes", icone: "ti-file-certificate" },
  { id: "simplificada", label: "Simplificada", descricao: "Desconto automático de R$ 16.754,34/ano",  icone: "ti-file-minus"       },
  { id: "comparativo",  label: "Comparar",    descricao: "Mostra qual modelo é mais vantajoso",       icone: "ti-scale"            },
];

export function FerramentaPGBL({ plan, onClose, onSave, savedResult }: Props) {
  const dc = plan?.dadosCliente;

  const idadeAtual = dc?.dataNascimento
    ? Math.floor(
        (Date.now() - new Date(dc.dataNascimento).getTime()) /
        (365.25 * 24 * 3600 * 1000)
      )
    : 0;
  const idadeMeta = plan?.planejamentoIF?.idadeMeta ?? 60;
  const nAnos     = idadeAtual > 0 ? Math.max(1, idadeMeta - idadeAtual) : 0;

  // Map legacy 'nao_sei' → 'comparativo' on load
  const initialTipo = savedResult?.tipoDeclaracao === "nao_sei"
    ? "comparativo"
    : (savedResult?.tipoDeclaracao ?? "");
  const [tipoDeclaracao, setTipoDeclaracao] = useState<string>(initialTipo);

  const renda             = useCurrencyInput(savedResult?.inputRendaAnualBruta ?? 0);
  const inssPago          = useCurrencyInput(savedResult?.inputInssPago ?? 0);
  const despesasMedicas   = useCurrencyInput(savedResult?.inputDespesasMedicas ?? (savedResult?.inputDespesas ?? 0));
  const despesasInstrucao = useCurrencyInput(savedResult?.inputDespesasInstrucao ?? 0);
  const pensao            = useCurrencyInput(savedResult?.inputPensaoAlimenticia ?? 0);
  const irRetido          = useCurrencyInput(savedResult?.inputIrRetidoFonte ?? (savedResult?.irRetidoFonte ?? 0));
  const aporteAnual       = useCurrencyInput(savedResult?.inputAporteAnualPGBL ?? 0);
  const saldoAtual        = useCurrencyInput(savedResult?.inputSaldoPrevidencia ?? 0);
  const [dependentes, setDependentes] = useState(String(savedResult?.inputDependentes ?? 0));
  const [salvo, setSalvo] = useState(false);
  const [painelAjudaAberto, setPainelAjudaAberto] = useState(false);

  const entrada: EntradaPgbl = useMemo(() => ({
    hoje: new Date(),
    tipoDeclaracao: tipoDeclaracao as TipoDeclaracao,
    rendaAnualBruta: renda.value,
    inssPago: inssPago.value,
    despesasMedicas: despesasMedicas.value,
    despesasInstrucao: despesasInstrucao.value,
    pensaoAlimenticia: pensao.value,
    dependentes: Math.max(0, parseInt(dependentes) || 0),
    aporteAnualPgbl: aporteAnual.value,
    irRetidoFonte: irRetido.value,
    saldoPrevidencia: saldoAtual.value,
    idadeAtual,
    idadeMeta,
  }), [tipoDeclaracao, renda.value, inssPago.value, despesasMedicas.value, despesasInstrucao.value,
      pensao.value, dependentes, aporteAnual.value, irRetido.value, saldoAtual.value, idadeAtual, idadeMeta]);

  const sim = useMemo(() => {
    if (renda.value <= 0) return null;
    return calcularResultadoPgbl(entrada);
  }, [renda.value, entrada]);

  const compararModelos = useMemo(() => {
    if (renda.value <= 0) return null;
    return compararModelosDeclaracao(entrada);
  }, [renda.value, entrada]);

  const tetoPGBLLive          = sim?.tetoPgbl ?? 0;
  const aproveitamentoPct     = sim?.aproveitamentoPct ?? 0;
  const excedenteAnual        = sim?.excedenteAnual ?? 0;
  const espacoDisponivel      = sim?.espacoDisponivelAnual ?? 0;
  const mesesRestantes        = sim?.mesesRestantes ?? 0;
  const aporteMensalDisponivel = sim?.aporteMensalDisponivel ?? 0;
  const jaInvestidoAno        = aporteAnual.value;
  const ultimoPonto           = sim?.projecao[sim.projecao.length - 1];
  const diferencaFinal        = ultimoPonto ? ultimoPonto.comPgbl - ultimoPonto.semPgbl : 0;
  const isencaoTotal          = renda.value > 0 && renda.value <= REDUTOR_2026_ISENCAO_ATE;

  function handleSave() {
    if (!onSave) return;
    onSave({
      tipoDeclaracao,
      rendaAnual:             renda.value,
      tetoPGBLAnual:          sim?.tetoPgbl ?? 0,
      aporteAnual:            aporteAnual.value,
      irComPGBL:              sim?.irComPgbl ?? 0,
      irSemPGBL:              sim?.irSemPgbl ?? 0,
      economiaAnual:          sim?.economiaAnual ?? 0,
      espacoDisponivelMensal: sim?.aporteMensalDisponivel ?? 0,
      aproveitandoTeto:       sim ? aporteAnual.value >= sim.tetoPgbl : false,
      irRetidoFonte:          irRetido.value,
      saldoSemPGBL:           sim?.saldoSemPgbl,
      saldoComPGBL:           sim?.saldoComPgbl,
      inputRendaAnualBruta:   renda.value,
      inputInssPago:          inssPago.value,
      inputDespesasMedicas:   despesasMedicas.value,
      inputDespesasInstrucao: despesasInstrucao.value,
      inputPensaoAlimenticia: pensao.value,
      inputDependentes:       Math.max(0, parseInt(dependentes) || 0),
      inputAporteAnualPGBL:   aporteAnual.value,
      inputIrRetidoFonte:     irRetido.value,
      inputSaldoPrevidencia:  saldoAtual.value,
      analisado:              true,
      dataUltimoSalvamento:   new Date().toISOString(),
    });
    setSalvo(true);
    setTimeout(() => {
      setSalvo(false);
      onClose?.();
    }, 2000);
  }

  const cardStyle = (_borderColor: string, bg = "white"): React.CSSProperties => ({
    backgroundColor: bg,
    border: "0.5px solid #E5E7EB",
    borderRadius: 12,
    padding: "20px 24px",
  });

  const inputStyle: React.CSSProperties = {
    border: "1px solid #E5E7EB", borderRadius: 8,
    padding: "8px 12px", fontSize: 13, width: "100%",
    outline: "none", fontFamily: "inherit",
    boxSizing: "border-box", color: "#111827",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "#6B7280",
    textTransform: "uppercase", letterSpacing: "0.04em",
    display: "block", marginBottom: 4,
  };

  const cardHeader = (icon: string, title: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12, borderBottom: "0.5px solid #F3F4F6", marginBottom: 16 }}>
      <i className={`ti ${icon}`} style={{ fontSize: 18, color: "#2563EB" }} />
      <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{title}</span>
    </div>
  );

  function metricBlock(label: string, value: string, color = "#111827", sub?: string) {
    return (
      <div style={{ backgroundColor: "#F8FAFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px 14px" }}>
        <p style={{ ...labelStyle, marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 16, fontWeight: 700, color, margin: 0 }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>{sub}</p>}
      </div>
    );
  }

  function resultCard(saldo: number) {
    const aPagar = saldo > 0;
    return (
      <div style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#6B7280" }}>Resultado Final</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: aPagar ? "#B91C1C" : "#15803D" }}>
          {aPagar
            ? `A pagar: ${formatBRL(saldo)}`
            : `A restituir: ${formatBRL(Math.abs(saldo))}`}
        </span>
      </div>
    );
  }

  const dadosGrafico = sim ? [
    { label: "IR sem PGBL", valor: sim.irSemPgbl,    fill: "#B91C1C", bg: "#FEE2E2" },
    { label: "IR com PGBL", valor: sim.irComPgbl,    fill: "#2563EB", bg: "#DBEAFE" },
    { label: "Economia",    valor: sim.economiaAnual, fill: "#15803D", bg: "#DCFCE7" },
  ] : [];

  const fmtBRLInt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const AJUDA_TRIBUTARIO = {
    titulo: "Planejamento Tributário",
    secoes: [
      {
        titulo: "O que é o Planejamento Tributário?",
        conteudo: `Esta seção analisa a eficiência fiscal do cliente e identifica oportunidades legais de redução do Imposto de Renda.\n\nO foco principal é a utilização do PGBL (Plano Gerador de Benefício Livre) como instrumento de dedução fiscal para quem declara pelo modelo completo.\n\nUma boa estratégia tributária pode representar uma economia significativa ao longo dos anos — recursos que permanecem investidos e continuam crescendo.`,
      },
      {
        titulo: "Modelo de Declaração",
        conteudo: `Modelo Completo:\nPermite deduzir despesas reais: INSS, médicas (sem teto), instrução (teto de R$ 3.561,50/pessoa/ano), dependentes (R$ 2.275,08/dep/ano), pensão alimentícia e PGBL (até 12% da renda bruta). Mais vantajoso quando a soma das deduções supera o desconto padrão de 20%.\n\nModelo Simplificado:\nA Receita Federal aplica automaticamente um desconto de 20% sobre a renda tributável (limitado a R$ 16.754,34 em 2026). O PGBL NÃO gera dedução adicional neste modelo.\n\nComparar:\nMostra os três cenários lado a lado (completa sem PGBL, completa com PGBL, simplificada) para identificar o mais vantajoso.`,
      },
      {
        titulo: "O que é o PGBL?",
        conteudo: `PGBL (Plano Gerador de Benefício Livre) é um plano de previdência privada com benefício fiscal exclusivo para quem declara pelo modelo completo.\n\nComo funciona: Contribuições ao PGBL podem ser deduzidas da base de cálculo do IR, limitadas a 12% da renda bruta anual tributável.\n\nEfeito prático: Se o cliente tem renda anual de R$ 240.000 e contribui R$ 28.800 (12%) ao PGBL, a base de cálculo do IR reduz em R$ 28.800 — gerando economia imediata de imposto.\n\nImportante: O IR é apenas diferido, não eliminado. No resgate incide alíquota sobre o total acumulado. Por isso é ideal para acumulação de longo prazo.`,
      },
      {
        titulo: "Teto do PGBL e deduções",
        conteudo: `Limite de dedução PGBL: 12% da Renda Bruta Anual Tributável.\n\nExemplo:\nRenda anual: R$ 240.000\nTeto PGBL: R$ 28.800/ano (R$ 2.400/mês)\n\nDeduções na declaração completa:\n- INSS pago: sem teto\n- Despesas médicas: sem teto\n- Instrução: R$ 3.561,50/ano por pessoa (titular + cada dependente)\n- Dependentes: R$ 2.275,08/dep/ano\n- Pensão alimentícia: sem teto\n- PGBL: até 12% da renda bruta\n\nAporte de PGBL em branco (zero): o simulador assume o teto cheio, mostrando a economia máxima possível.`,
      },
      {
        titulo: "IR Retido na Fonte e Saldo",
        conteudo: `O IR Retido na Fonte é o imposto já descontado pelo empregador ao longo do ano.\n\nSaldo = Imposto Devido − IR Retido na Fonte\n\nPositivo → A pagar (DARF na entrega da declaração)\nNegativo → A restituir (Receita Federal devolve)\n\nO IR retido não muda a base de cálculo nem o imposto devido — apenas muda se o cliente vai pagar ou receber na entrega.`,
      },
      {
        titulo: "Reforma do IRPF 2026",
        conteudo: `Em 2026, uma faixa de isenção adicional foi criada:\n\nAté R$ 60.000/ano (R$ 5.000/mês): imposto zerado pelo desconto complementar, independente da tabela progressiva.\n\nDe R$ 60.000 a R$ 88.200/ano: redução linear do imposto (proporcional à distância do limite de isenção).\n\nAcima de R$ 88.200/ano: tabela progressiva plena, sem redutor.\n\nPara rendas na faixa de isenção, o PGBL só faz sentido como estratégia de acumulação (sem economia fiscal direta), ou para rendas futuras tributáveis no resgate.`,
      },
      {
        titulo: "Score Tributário",
        conteudo: `O score reflete a eficiência fiscal do cliente:\n\nSimplificada → score 100 (não há como otimizar, está no modelo correto)\n\nNão analisado → "Não avaliado" (sem impacto no score geral)\n\nCompleta + sem PGBL → score 0 (grande oportunidade desperdiçada)\n\nCompleta + 25% do teto → score 25\nCompleta + 50% do teto → score 50\nCompleta + 100% do teto → score 100`,
      },
      {
        titulo: "Dicas para o consultor",
        conteudo: `• Sempre verifique qual modelo (completa/simplificada) é mais vantajoso antes de recomendar o PGBL — use o modo "Comparar".\n\n• O PGBL só faz sentido para quem declara pelo modelo completo. Para simplificada, o VGBL é mais indicado.\n\n• Contribuições acima do teto de 12% não são dedutíveis — o excedente deve ir para VGBL.\n\n• Para profissionais autônomos com renda variável, calcule o teto com base na renda tributável média anual.\n\n• O benefício é ainda maior para quem está na alíquota marginal de 27,5% — a economia por real deduzido é máxima nessa faixa.`,
      },
    ],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── HEADER COM BOTÃO AJUDA ────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>Planejamento Tributário</p>
        <button
          onClick={() => setPainelAjudaAberto(true)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "#EFF6FF", border: "1px solid #BFDBFE",
            borderRadius: 20, padding: "4px 10px", cursor: "pointer",
            fontSize: 11, fontWeight: 600, color: "#2563EB", fontFamily: "inherit",
          }}
        >
          <i className="ti ti-help-circle" style={{ fontSize: 13 }} />
          Ajuda
        </button>
      </div>

      {/* ── CARD 1: Tipo de Declaração ─────────────────────────────────────── */}
      <div style={cardStyle("")}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12, borderBottom: "0.5px solid #F3F4F6", marginBottom: 16 }}>
          <i className="ti ti-file-text" style={{ fontSize: 18, color: "#2563EB" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Tipo de Declaração IR</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {TIPOS_DECLARACAO.map((tipo) => {
            const ativo = tipoDeclaracao === tipo.id;
            return (
              <div
                key={tipo.id}
                onClick={() => setTipoDeclaracao(tipo.id)}
                style={{
                  border: ativo ? "2px solid #2563EB" : "1px solid #E5E7EB",
                  borderRadius: 10, padding: "14px 16px",
                  cursor: "pointer", background: ativo ? "#EFF6FF" : "white",
                  transition: "all 150ms",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <i className={`ti ${tipo.icone}`} style={{ fontSize: 18, color: ativo ? "#2563EB" : "#9CA3AF" }} />
                  <span style={{ fontSize: 13, fontWeight: ativo ? 700 : 500, color: ativo ? "#2563EB" : "#374151" }}>
                    {tipo.label}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: ativo ? "#2563EB" : "#9CA3AF", lineHeight: 1.4 }}>
                  {tipo.descricao}
                </div>
              </div>
            );
          })}
        </div>

        {tipoDeclaracao === "simplificada" && (
          <div style={{ marginTop: 12, background: "#FEF3C7", border: "0.5px solid #FCD34D", borderLeft: "4px solid #B45309", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <i className="ti ti-alert-triangle" style={{ color: "#B45309", fontSize: 14, marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "#92400E", margin: 0, lineHeight: 1.5 }}>
              Na declaração simplificada, o PGBL <strong>não gera dedução fiscal</strong>. As deduções individuais são substituídas pelo desconto automático de R$ 16.754,34.
            </p>
          </div>
        )}
        {tipoDeclaracao === "comparativo" && (
          <div style={{ marginTop: 12, background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderLeft: "4px solid #2563EB", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <i className="ti ti-info-circle" style={{ color: "#2563EB", fontSize: 14, marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "#1E40AF", margin: 0, lineHeight: 1.5 }}>
              Modo comparativo — mostrando os três cenários (completa sem PGBL, completa com PGBL e simplificada) para identificar o mais vantajoso.
            </p>
          </div>
        )}
      </div>

      {/* ── CARD 2: Dados da Declaração ───────────────────────────────────── */}
      <div style={cardStyle("")}>
        {cardHeader("ti-receipt", "Dados da Declaração")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Renda bruta (full width) */}
          <div style={{ gridColumn: "span 2" }}>
            <span style={labelStyle}>Renda Bruta Anual Tributável (R$)</span>
            <input type="text" value={renda.display} onChange={renda.onChange} onBlur={renda.onBlur} placeholder="0,00" style={inputStyle} />
          </div>

          {/* INSS */}
          <div>
            <span style={labelStyle}>INSS Pago no Ano (R$)</span>
            <input type="text" value={inssPago.display} onChange={inssPago.onChange} onBlur={inssPago.onBlur} placeholder="0,00" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Dedução integral na declaração completa</p>
          </div>

          {/* Dependentes */}
          <div>
            <span style={labelStyle}>Dependentes</span>
            <input type="number" min={0} max={10} value={dependentes} onChange={(e) => setDependentes(e.target.value)} style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>{formatBRL(DEDUCAO_DEPENDENTE_ANUAL)}/dep/ano deduzidos</p>
          </div>

          {/* Despesas Médicas */}
          <div>
            <span style={labelStyle}>Despesas Médicas (R$)</span>
            <input type="text" value={despesasMedicas.display} onChange={despesasMedicas.onChange} onBlur={despesasMedicas.onBlur} placeholder="0,00" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Sem teto — dedução integral</p>
          </div>

          {/* Despesas com Instrução */}
          <div>
            <span style={labelStyle}>Despesas com Instrução (R$)</span>
            <input type="text" value={despesasInstrucao.display} onChange={despesasInstrucao.onChange} onBlur={despesasInstrucao.onBlur} placeholder="0,00" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Teto de {formatBRL(LIMITE_DESPESA_INSTRUCAO_ANUAL_POR_PESSOA)}/pessoa/ano</p>
          </div>

          {/* Pensão Alimentícia */}
          <div>
            <span style={labelStyle}>Pensão Alimentícia (R$)</span>
            <input type="text" value={pensao.display} onChange={pensao.onChange} onBlur={pensao.onBlur} placeholder="0,00" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Dedução integral com decisão judicial</p>
          </div>

          {/* IR Retido na Fonte */}
          <div>
            <span style={labelStyle}>IR Retido na Fonte no Ano (R$)</span>
            <input type="text" value={irRetido.display} onChange={irRetido.onChange} onBlur={irRetido.onBlur} placeholder="0,00" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Imposto já descontado em folha pelo empregador</p>
          </div>

          {/* Saldo na Previdência */}
          <div>
            <span style={labelStyle}>Saldo Atual na Previdência (R$)</span>
            <input type="text" value={saldoAtual.display} onChange={saldoAtual.onChange} onBlur={saldoAtual.onBlur} placeholder="0,00" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Usado na projeção patrimonial</p>
          </div>

          {/* Aporte PGBL */}
          <div style={{ gridColumn: "span 2" }}>
            <span style={labelStyle}>Investimento em PGBL no Ano Vigente (R$)</span>
            <input type="text" value={aporteAnual.display} onChange={aporteAnual.onChange} onBlur={aporteAnual.onBlur} placeholder="0,00 — deixe em branco para simular o teto cheio" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>
              Deixe em branco (zero) para ver a economia máxima possível (teto de 12%)
            </p>
            {tetoPGBLLive > 0 && tipoDeclaracao !== "simplificada" && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 11, color: "#6B7280" }}>
                <span>Teto anual: {formatBRL(tetoPGBLLive)} ({formatBRL(tetoPGBLLive / 12)}/mês)</span>
                <span style={{ fontWeight: 600, color: aproveitamentoPct >= 80 ? "#15803D" : aproveitamentoPct >= 50 ? "#B45309" : "#B91C1C" }}>
                  {aproveitamentoPct}% aproveitado
                </span>
              </div>
            )}
            {excedenteAnual > 0 && tipoDeclaracao !== "simplificada" && (
              <p style={{ fontSize: 11, color: "#B91C1C", margin: "4px 0 0" }}>
                Aporte acima do teto dedutível ({formatBRL(tetoPGBLLive)}/ano)
              </p>
            )}
            {tipoDeclaracao === "completa" && espacoDisponivel > 0 && (
              <p style={{ fontSize: 11, color: "#15803D", margin: "4px 0 0" }}>
                Espaço disponível para deduzir: {formatBRL(espacoDisponivel)}/ano
              </p>
            )}
          </div>
        </div>

        {excedenteAnual > 0 && tipoDeclaracao === "completa" && (
          <div style={{ marginTop: 12, background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderLeft: "4px solid #2563EB", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <i className="ti ti-info-circle" style={{ color: "#2563EB", fontSize: 14, marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "#1E40AF", margin: 0, lineHeight: 1.5 }}>
              <strong>Considere VGBL para o excedente:</strong> Você está aportando {formatBRL(excedenteAnual)}/ano acima do teto dedutível de 12% da renda bruta. O excedente não gera benefício fiscal no PGBL — o VGBL pode ser uma alternativa.
            </p>
          </div>
        )}
        {excedenteAnual > 0 && tipoDeclaracao === "simplificada" && (
          <div style={{ marginTop: 12, background: "#FEF3C7", border: "0.5px solid #FCD34D", borderLeft: "4px solid #B45309", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <i className="ti ti-alert-triangle" style={{ color: "#B45309", fontSize: 14, marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "#92400E", margin: 0, lineHeight: 1.5 }}>
              <strong>Atenção: PGBL sem benefício na simplificada.</strong> Além disso, o aporte de {formatBRL(excedenteAnual)}/ano está acima do teto de 12% da renda bruta. O VGBL pode ser mais adequado.
            </p>
          </div>
        )}
      </div>

      {/* ── CARD: Espaço Disponível para Dedução PGBL ────────────────────── */}
      {tipoDeclaracao === "completa" && renda.value > 0 && (
        <div style={{ background: "#F0F7FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF", marginBottom: 14 }}>
            Espaço disponível para dedução PGBL
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ background: "white", borderRadius: 8, padding: "12px 14px", border: "0.5px solid #E5E7EB" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>Teto PGBL (12%)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{fmtBRLInt(tetoPGBLLive)}</div>
              <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>no ano</div>
            </div>
            <div style={{ background: "white", borderRadius: 8, padding: "12px 14px", border: "0.5px solid #E5E7EB" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>Já investido</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: jaInvestidoAno > tetoPGBLLive ? "#B91C1C" : "#111827" }}>
                {fmtBRLInt(jaInvestidoAno)}
              </div>
              <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>em {new Date().getFullYear()}</div>
            </div>
            <div style={{
              background: espacoDisponivel > 0 ? "#F0FDF4" : "#FEF2F2",
              borderRadius: 8, padding: "12px 14px",
              border: `0.5px solid ${espacoDisponivel > 0 ? "#86EFAC" : "#FECACA"}`,
            }}>
              <div style={{ fontSize: 10, color: espacoDisponivel > 0 ? "#15803D" : "#B91C1C", marginBottom: 4, fontWeight: 600 }}>
                {espacoDisponivel > 0 ? "Ainda disponível" : "Teto atingido"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: espacoDisponivel > 0 ? "#15803D" : "#B91C1C" }}>
                {fmtBRLInt(espacoDisponivel)}
              </div>
              <div style={{ fontSize: 10, color: espacoDisponivel > 0 ? "#15803D" : "#B91C1C", marginTop: 2 }}>
                até dezembro
              </div>
            </div>
          </div>

          {espacoDisponivel > 0 && mesesRestantes > 0 && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "white", borderRadius: 8, border: "0.5px solid #BFDBFE", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>
                  Aporte mensal sugerido para aproveitar o teto até dezembro
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
                  {mesesRestantes} {mesesRestantes === 1 ? "mês restante" : "meses restantes"} no ano
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#2563EB", whiteSpace: "nowrap" }}>
                {fmtBRLInt(aporteMensalDisponivel)}/mês
              </div>
            </div>
          )}

          {espacoDisponivel <= 0 && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#FEF2F2", borderRadius: 8, border: "0.5px solid #FECACA", fontSize: 11, color: "#B91C1C" }}>
              O cliente já atingiu ou ultrapassou o teto de dedução do PGBL para {new Date().getFullYear()}.
              Contribuições adicionais não serão dedutíveis e devem ser direcionadas ao VGBL.
            </div>
          )}
        </div>
      )}

      {/* ── COMPARATIVO: Completa × Simplificada ────────────────────────── */}
      {tipoDeclaracao === "comparativo" && compararModelos && renda.value > 0 && (
        <div style={cardStyle("")}>
          {cardHeader("ti-table", "Comparativo: Completa × Simplificada")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {compararModelos.cenarios.map((c) => {
              const isMelhor = c.id === compararModelos.melhorId;
              return (
                <div key={c.id} style={{
                  background: isMelhor ? "#F0FDF4" : "white",
                  border: `1px solid ${isMelhor ? "#86EFAC" : "#E5E7EB"}`,
                  borderRadius: 10, padding: "14px 16px",
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isMelhor ? "#15803D" : "#374151" }}>
                      {c.label}
                    </span>
                    {isMelhor && (
                      <span style={{ fontSize: 10, background: "#DCFCE7", color: "#15803D", padding: "2px 6px", borderRadius: 999, fontWeight: 600 }}>
                        Melhor
                      </span>
                    )}
                  </div>
                  {metricBlock("Deduções", formatBRL(c.deducoes))}
                  {metricBlock("Base de Cálculo", formatBRL(c.base))}
                  {metricBlock("Imposto", formatBRL(c.imposto), isMelhor ? "#15803D" : "#B91C1C")}
                  {metricBlock("Alíquota Efetiva", c.aliquotaEfetiva.toFixed(2) + "%")}
                  {resultCard(c.saldo)}
                </div>
              );
            })}
          </div>
          {compararModelos.diferencaAnual > 0 && (
            <div style={{ marginTop: 12, background: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#15803D", fontWeight: 600 }}>
                Vantagem do modelo mais eficiente
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#15803D" }}>
                {formatBRL(compararModelos.diferencaAnual)}/ano
              </span>
            </div>
          )}
        </div>
      )}

      {sim && tipoDeclaracao !== "comparativo" && (
        <>
          {/* ── CARD 4: Resultado ─────────────────────────────────────────── */}
          <div style={cardStyle("")}>
            {cardHeader("ti-balance", "Resultado")}

            {/* Banner isenção total (renda ≤ R$ 5.000/mês) */}
            {isencaoTotal && (
              <div style={{ marginBottom: 16, background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderLeft: "4px solid #2563EB", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <i className="ti ti-info-circle" style={{ color: "#2563EB", fontSize: 14, marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: "#1E40AF", margin: 0, lineHeight: 1.7 }}>
                  <strong>Isenção pela Reforma do IRPF 2026:</strong> Renda anual de {formatBRL(renda.value)} está abaixo de R$ 60.000/ano (R$ 5.000/mês). O imposto é zerado integralmente pelo desconto complementar da reforma.
                  {sim.economiaAnual === 0 && (
                    <> O PGBL pode ser avaliado como estratégia de acumulação via VGBL em vez de diferimento fiscal.</>
                  )}
                </p>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: tipoDeclaracao === "simplificada" ? "1fr" : "1fr 1fr", gap: 16 }}>
              {/* Sem PGBL */}
              <div style={{ background: "#FFF5F5", border: "0.5px solid #FECACA", borderRadius: 10, padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <i className="ti ti-trending-up" style={{ fontSize: 16, color: "#B91C1C" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C" }}>
                    {tipoDeclaracao === "simplificada" ? "Declaração Simplificada" : "Sem PGBL"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  {metricBlock("Base de Cálculo", formatBRL(sim.baseSemPgbl))}
                  {metricBlock("Imposto Devido",    formatBRL(sim.irSemPgbl), "#B91C1C")}
                  {metricBlock("Alíquota Efetiva",  sim.aliquotaEfetivaSem.toFixed(2) + "%")}
                </div>
                {resultCard(sim.saldoSemPgbl)}
              </div>

              {/* Com PGBL — oculto na simplificada */}
              {tipoDeclaracao !== "simplificada" && (
                <div style={{ background: "#F0FDF4", border: "0.5px solid #BBF7D0", borderRadius: 10, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <i className="ti ti-trending-down" style={{ fontSize: 16, color: "#15803D" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>Com PGBL</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                    {metricBlock("Nova Base",            formatBRL(sim.baseComPgbl))}
                    {metricBlock("Novo Imposto",          formatBRL(sim.irComPgbl), "#15803D")}
                    {metricBlock("Nova Alíquota Efetiva", sim.aliquotaEfetivaCom.toFixed(2) + "%")}
                  </div>
                  {resultCard(sim.saldoComPgbl)}
                </div>
              )}
            </div>
          </div>

          {/* ── CARD 5: Gráfico Comparativo ──────────────────────────────── */}
          {sim.irSemPgbl > 0 && (
            <div style={cardStyle("")}>
              {cardHeader("ti-chart-bar", "Comparativo de IR")}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                {dadosGrafico.map((d) => (
                  <div key={d.label} style={{ background: d.bg, borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 10, color: d.fill, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                      <span>{d.label}</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: d.fill }}>
                      {d.valor > 0 ? fmtBRLInt(d.valor) : "—"}
                    </div>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dadosGrafico} margin={{ top: 20, right: 20, bottom: 0, left: 20 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                    tickFormatter={(v: unknown) => {
                      const n = Number(v);
                      return n >= 1000 ? `R$ ${(n / 1000).toFixed(0)}k` : `R$ ${n}`;
                    }}
                    axisLine={false} tickLine={false}
                  />
                  <RechartsTooltip
                    formatter={(v: unknown) => [fmtBRLInt(Number(v)), ""]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid #E5E7EB" }}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {dadosGrafico.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    <LabelList dataKey="valor" position="top" formatter={(v: unknown) => fmtBRLInt(Number(v))} style={{ fontSize: 11, fill: "#374151" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── CARD 6: Projeção Patrimonial ─────────────────────────────── */}
          {idadeAtual === 0 ? (
            <div style={{ background: "#F0F7FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 20, textAlign: "center" }}>
              <i className="ti ti-info-circle" style={{ fontSize: 22, color: "#60A5FA", marginBottom: 8, display: "block" }} />
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>
                Preencha a data de nascimento e idade de aposentadoria na Coleta de Dados para visualizar a projeção.
              </p>
            </div>
          ) : sim.projecao.length > 0 ? (
            <div style={cardStyle("#2563EB")}>
              {cardHeader("ti-trending-up", "Projeção Patrimonial")}
              <p style={{ fontSize: 12, color: "#6B7280", margin: "-8px 0 12px" }}>
                Projeção em {nAnos} anos · Taxa IPCA+5% a.a.
              </p>

              <div style={{ display: "flex", gap: 20, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 20, height: 2, backgroundColor: "#B91C1C" }} />
                  <span style={{ fontSize: 12, color: "#374151" }}>Sem PGBL</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 20, height: 2, backgroundColor: "#15803D" }} />
                  <span style={{ fontSize: 12, color: "#374151" }}>Com PGBL + restituição reinvestida</span>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={sim.projecao} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="idade"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    tickFormatter={(v: unknown) => `${v} anos`}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    tickFormatter={(v: unknown) => {
                      const n = Number(v);
                      if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
                      if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
                      return `R$ ${n}`;
                    }}
                    width={80}
                  />
                  <RechartsTooltip
                    formatter={(value: unknown, name: unknown) => [
                      Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
                      name === "semPgbl" ? "Sem PGBL" : "Com PGBL + restituição",
                    ]}
                    labelFormatter={(v: unknown) => `Idade: ${v} anos`}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid #E5E7EB" }}
                  />
                  <Line type="monotone" dataKey="semPgbl" stroke="#B91C1C" strokeWidth={2} dot={false} name="semPgbl" />
                  <Line type="monotone" dataKey="comPgbl" stroke="#15803D" strokeWidth={2} dot={false} name="comPgbl" />
                </LineChart>
              </ResponsiveContainer>

              <div style={{ backgroundColor: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: 10, padding: "16px 20px", marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: 12, color: "#15803D", margin: "0 0 4px" }}>Diferença acumulada em {nAnos} anos</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatBRL(diferencaFinal)}</p>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: "2px 0 0" }}>a favor do Cenário B (com PGBL)</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", margin: "0 0 4px" }}>Economia anual reinvestida</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatBRL(sim.economiaAnual)}</p>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: "2px 0 0" }}>× {nAnos} anos + juros compostos</p>
                </div>
              </div>

              {sim.economiaAnual > 0 && (
                <div style={{ marginTop: 12, background: "#F0FDF4", border: "0.5px solid #BBF7D0", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <i className="ti ti-sparkles" style={{ fontSize: 15, color: "#15803D" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#15803D" }}>O Poder da Eficiência Tributária</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#14532D", margin: 0, lineHeight: 1.6 }}>
                    Ao contribuir <strong>{formatBRL(sim.aporteEfetivo / 12)}/mês</strong> em PGBL,
                    você economiza <strong>{formatBRL(sim.economiaAnual)}/ano</strong> no IR.
                    Reinvestindo essa restituição a uma taxa conservadora de IPCA+5% ao ano, a diferença
                    acumulada em <strong>{nAnos} anos</strong> é de{" "}
                    <strong>{formatBRL(diferencaFinal)}</strong> — o poder dos juros compostos trabalhando ao seu favor.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}

      {/* ── PAINEL LATERAL DE AJUDA ─────────────────────────────────────────── */}
      <PainelAjuda
        titulo={AJUDA_TRIBUTARIO.titulo}
        secoes={AJUDA_TRIBUTARIO.secoes}
        aberto={painelAjudaAberto}
        onFechar={() => setPainelAjudaAberto(false)}
      />

      {/* ── Salvar ────────────────────────────────────────────────────────── */}
      {onSave && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 0 0", marginTop: 8, borderTop: "0.5px solid #E5E7EB" }}>
          <button
            onClick={handleSave}
            disabled={salvo}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              backgroundColor: salvo ? "#15803D" : "#2563EB",
              color: "white", border: "none", borderRadius: 8,
              padding: "8px 20px", fontSize: 13, fontWeight: 600,
              cursor: salvo ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
            }}
          >
            {salvo ? (
              <><i className="ti ti-circle-check" style={{ fontSize: 15 }} /> Salvo!</>
            ) : (
              <><i className="ti ti-device-floppy" style={{ fontSize: 15 }} /> Salvar simulação</>
            )}
          </button>
        </div>
      )}

      <p style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.5, margin: 0, textAlign: "center" }}>
        Cálculo baseado na tabela oficial da Receita Federal 2026. Inclui redutor de isenção para rendas até
        R$ 5.000/mês. PGBL: dedução de até 12% da renda bruta na declaração completa. Despesas com instrução:
        teto de {formatBRL(LIMITE_DESPESA_INSTRUCAO_ANUAL_POR_PESSOA)}/pessoa/ano. IR no resgate: alíquota
        regressiva de 15% (prazo &gt; 720 dias).
      </p>
    </div>
  );
}
