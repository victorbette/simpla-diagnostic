import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip,
  CartesianGrid, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList,
} from "recharts";
import type { FinancialPlan } from "@/types/financialPlanning";
import { formatBRL, DEDUCAO_DEPENDENTE } from "@/lib/tax";
import { simularDeclaracaoIRPF, calcularProjecaoPatrimonio } from "@/lib/simularDeclaracao";
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
  inputRendaAnualBruta?: number;
  inputDespesas?: number;
  inputDependentes?: number;
  inputAporteAnualPGBL?: number;
  inputSaldoPrevidencia?: number;
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
  { id: "completa",     label: "Completa",     descricao: "Deduz dependentes, saúde, educação", icone: "ti-file-certificate" },
  { id: "simplificada", label: "Simplificada", descricao: "Desconto automático de R$ 16.754,34/ano",   icone: "ti-file-minus"       },
  { id: "nao_sei",      label: "Não sei",      descricao: "Consultor vai orientar",              icone: "ti-help-circle"      },
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

  const [tipoDeclaracao, setTipoDeclaracao] = useState<string>(
    savedResult?.tipoDeclaracao ?? ""
  );

  const renda      = useCurrencyInput(savedResult?.inputRendaAnualBruta ?? 0);
  const despesas   = useCurrencyInput(savedResult?.inputDespesas ?? 0);
  const aporteAnual = useCurrencyInput(savedResult?.inputAporteAnualPGBL ?? 0);
  const saldoAtual  = useCurrencyInput(savedResult?.inputSaldoPrevidencia ?? 0);
  const [dependentes, setDependentes] = useState(String(savedResult?.inputDependentes ?? 0));
  const [salvo, setSalvo] = useState(false);
  const [painelAjudaAberto, setPainelAjudaAberto] = useState(false);

  const sim = useMemo(() => {
    if (renda.value <= 0) return null;
    const aporteAnualVal = aporteAnual.value > 0 ? aporteAnual.value : undefined;
    return simularDeclaracaoIRPF({
      rendaBruta:     renda.value,
      despesas:       despesas.value,
      dependentes:    Math.max(0, parseInt(dependentes) || 0),
      aporteAnual:    aporteAnualVal,
      tipoDeclaracao,
    });
  }, [renda.value, despesas.value, dependentes, aporteAnual.value, tipoDeclaracao]);

  const projecao = useMemo(() => {
    if (!sim || sim.economia <= 0) return [];
    return calcularProjecaoPatrimonio({
      aporteAnualPGBL: sim.aporteEfetivo,
      economiaAnual:   sim.economia,
      nAnos,
      idadeAtual,
      saldoInicial:    saldoAtual.value,
    });
  }, [sim, nAnos, idadeAtual, saldoAtual.value]);

  const ultimoPonto = projecao[projecao.length - 1];
  const diferencaFinal = ultimoPonto ? ultimoPonto.comPGBL - ultimoPonto.semPGBL : 0;

  const aporteAnualPGBL  = aporteAnual.value;
  const tetoPGBLLive     = sim?.tetoPGBL ?? 0;
  const aproveitamentoPct = tetoPGBLLive > 0
    ? Math.min(100, Math.round((aporteAnualPGBL / tetoPGBLLive) * 100))
    : 0;
  const excedenteAnual   = tetoPGBLLive > 0 ? Math.max(0, aporteAnualPGBL - tetoPGBLLive) : 0;
  const espacoDisponivel = tetoPGBLLive > 0 ? Math.max(0, tetoPGBLLive - aporteAnualPGBL) : 0;

  const mesAtual = new Date().getMonth() + 1; // 1–12
  const mesesRestantes = Math.max(0, 12 - mesAtual + 1);
  const jaInvestidoAno = aporteAnual.value;
  const aporteMensalDisponivel = mesesRestantes > 0 && espacoDisponivel > 0
    ? espacoDisponivel / mesesRestantes
    : 0;

  function handleSave() {
    if (!onSave) return;
    onSave({
      tipoDeclaracao,
      rendaAnual:             renda.value,
      tetoPGBLAnual:          sim?.tetoPGBL ?? 0,
      aporteAnual:            aporteAnual.value,
      irComPGBL:              sim?.irComPGBL ?? 0,
      irSemPGBL:              sim?.irSemPGBL ?? 0,
      economiaAnual:          sim?.economia ?? 0,
      espacoDisponivelMensal: sim ? Math.max(0, (sim.tetoPGBL - aporteAnual.value) / 12) : 0,
      aproveitandoTeto:       sim ? aporteAnual.value >= sim.tetoPGBL : false,
      inputRendaAnualBruta:   renda.value,
      inputDespesas:          despesas.value,
      inputDependentes:       Math.max(0, parseInt(dependentes) || 0),
      inputAporteAnualPGBL:   aporteAnual.value,
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

  function resultCard(resultado: number) {
    const aPagar = resultado > 0;
    return (
      <div style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#6B7280" }}>Resultado Final</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: aPagar ? "#B91C1C" : "#15803D" }}>
          {aPagar
            ? `A pagar: ${formatBRL(resultado)}`
            : `A restituir: ${formatBRL(Math.abs(resultado))}`}
        </span>
      </div>
    );
  }

  const dadosGrafico = sim ? [
    { label: "IR sem PGBL", valor: sim.irSemPGBL, fill: "#B91C1C", bg: "#FEE2E2" },
    { label: "IR com PGBL", valor: sim.irComPGBL, fill: "#2563EB", bg: "#DBEAFE" },
    { label: "Economia",    valor: sim.economia,   fill: "#15803D", bg: "#DCFCE7" },
  ] : [];

  const fmtBRLInt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const AJUDA_TRIBUTARIO = {
    titulo: 'Planejamento Tributário',
    secoes: [
      {
        titulo: 'O que é o Planejamento Tributário?',
        conteudo: `Esta seção analisa a eficiência fiscal do cliente e identifica oportunidades legais de redução do Imposto de Renda.\n\nO foco principal é a utilização do PGBL (Plano Gerador de Benefício Livre) como instrumento de dedução fiscal para quem declara pelo modelo completo.\n\nUma boa estratégia tributária pode representar uma economia significativa ao longo dos anos — recursos que permanecem investidos e continuam crescendo.`,
      },
      {
        titulo: 'Modelo de Declaração',
        conteudo: `Modelo Simplificado:\nA Receita Federal aplica automaticamente um desconto de 20% sobre a renda tributável (limitado a R$ 16.754,34 em 2026). É mais vantajoso quando as deduções individuais são menores que esse desconto.\n\nNeste modelo, contribuições ao PGBL NÃO geram dedução adicional.\n\nModelo Completo:\nPermite deduzir despesas reais: médicas, educação, dependentes e contribuições ao PGBL (até 12% da renda bruta anual).\n\nÉ mais vantajoso quando a soma das deduções supera o desconto do modelo simplificado.\n\nNão sei:\nQuando o cliente não sabe qual modelo utiliza, o planejamento tributário fica marcado como "Não avaliado" e não impacta o score.`,
      },
      {
        titulo: 'O que é o PGBL?',
        conteudo: `PGBL (Plano Gerador de Benefício Livre) é um plano de previdência privada com benefício fiscal exclusivo para quem declara pelo modelo completo.\n\nComo funciona o benefício:\nContribuições ao PGBL podem ser deduzidas da base de cálculo do IR, limitadas a 12% da renda bruta anual tributável.\n\nEfeito prático:\nSe o cliente tem renda anual de R$ 240.000 e contribui R$ 28.800 (12%) ao PGBL, a base de cálculo do IR reduz em R$ 28.800 — gerando economia imediata de imposto.\n\nImportante: o IR é apenas diferido, não eliminado. No resgate, incidirá alíquota sobre o total acumulado. Por isso é ideal para acumulação de longo prazo.`,
      },
      {
        titulo: 'Teto do PGBL',
        conteudo: `O limite legal de dedução é 12% da Renda Bruta Anual Tributável.\n\nExemplo:\nRenda anual: R$ 240.000\nTeto PGBL: R$ 240.000 × 12% = R$ 28.800/ano\nou R$ 2.400/mês\n\nAproveitamento:\nQuanto mais próximo do teto o cliente contribui, maior a eficiência fiscal e melhor o score tributário.\n\n0% do teto → score baixo (oportunidade desperdiçada)\n100% do teto → score máximo (máxima eficiência)`,
      },
      {
        titulo: 'Como o IR é calculado?',
        conteudo: `Tabela IRPF 2026 (anual):\n\nAté R$ 26.963,20 → isento\nR$ 26.963,21 a R$ 33.919,80 → 7,5%\nR$ 33.919,81 a R$ 45.012,60 → 15%\nR$ 45.012,61 a R$ 55.976,16 → 22,5%\nAcima de R$ 55.976,16 → 27,5%\n\nDeduções no modelo completo:\n- Dependentes: R$ 2.275,08/ano por dependente\n- Despesas dedutíveis: médicas, educação, etc.\n- PGBL: até 12% da renda bruta\n\nA base de cálculo é: Renda - Deduções - PGBL`,
      },
      {
        titulo: 'Economia e Diferimento',
        conteudo: `A economia fiscal é a diferença entre o IR sem PGBL e o IR com PGBL:\n\nEconomia = IR (sem PGBL) - IR (com PGBL)\n\nEssa economia não desaparece — ela fica investida na previdência, continuando a render até o resgate.\n\nDiferimento:\nO benefício do PGBL é o diferimento do IR — você paga o imposto no futuro (no resgate) em vez de agora. Como o valor fica investido mais tempo, o resultado final é maior mesmo pagando IR no resgate.`,
      },
      {
        titulo: 'Score Tributário',
        conteudo: `O score reflete a eficiência fiscal do cliente:\n\nSimplificada → score 100\n(não há como otimizar, está no modelo correto)\n\nNão sabe / Não analisado → "Não avaliado"\n(sem impacto no score geral)\n\nCompleta + sem PGBL → score 0\n(grande oportunidade desperdiçada)\n\nCompleta + 25% do teto → score 25\nCompleta + 50% do teto → score 50\nCompleta + 100% do teto → score 100`,
      },
      {
        titulo: 'Dicas para o consultor',
        conteudo: `• Sempre verifique se o modelo simplificado ou completo é mais vantajoso antes de recomendar o PGBL.\n\n- O PGBL só faz sentido para quem declara pelo modelo completo. Para o modelo simplificado, o VGBL é mais indicado (sem dedução, mas sem IR sobre o total no resgate).\n\n- Contribuições acima do teto de 12% não são dedutíveis — o excedente deve ir para VGBL.\n\n- Para profissionais autônomos com renda variável, calcule o teto com base na renda tributável média anual.\n\n- O benefício é ainda maior para quem está na alíquota marginal de 27,5% — a economia por real deduzido é máxima nessa faixa.`,
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
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: 20,
            padding: "4px 10px",
            cursor: "pointer",
            fontSize: 11, fontWeight: 600,
            color: "#2563EB",
            fontFamily: "inherit",
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
              Na declaração simplificada, o PGBL <strong>não gera dedução fiscal</strong>. O resultado abaixo mostra o IR com desconto automático de R$ 16.754,34 — sem benefício PGBL.
            </p>
          </div>
        )}
        {tipoDeclaracao === "nao_sei" && (
          <div style={{ marginTop: 12, background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderLeft: "4px solid #2563EB", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <i className="ti ti-info-circle" style={{ color: "#2563EB", fontSize: 14, marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "#1E40AF", margin: 0, lineHeight: 1.5 }}>
              Tipo não definido — mostrando estimativa com <strong>deduções da declaração completa</strong>. O consultor vai orientar na escolha do modelo mais vantajoso.
            </p>
          </div>
        )}
      </div>

      {/* ── CARD 2: Dados da Declaração ───────────────────────────────────── */}
      <div style={cardStyle("")}>
        {cardHeader("ti-receipt", "Dados da Declaração")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>Renda Bruta Anual Tributável (R$)</span>
            </div>
            <input type="text" value={renda.display} onChange={renda.onChange} onBlur={renda.onBlur} placeholder="0,00" style={inputStyle} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>Despesas Dedutíveis (R$)</span>
            </div>
            <input type="text" value={despesas.display} onChange={despesas.onChange} onBlur={despesas.onBlur} placeholder="0,00" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Saúde, educação, pensão alimentícia</p>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>Dependentes</span>
            </div>
            <input type="number" min={0} max={10} value={dependentes} onChange={(e) => setDependentes(e.target.value)} style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>{formatBRL(DEDUCAO_DEPENDENTE)}/dep/ano deduzidos</p>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>Saldo Atual na Previdência (R$)</span>
            </div>
            <input
              type="text"
              value={saldoAtual.display}
              onChange={saldoAtual.onChange}
              onBlur={saldoAtual.onBlur}
              placeholder="0,00"
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>
              Saldo acumulado em previdência (usado na projeção patrimonial)
            </p>
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>Investimento em Previdência Privada (PGBL) no ano vigente (R$)</span>
            </div>
            <input
              type="text"
              value={aporteAnual.display}
              onChange={aporteAnual.onChange}
              onBlur={aporteAnual.onBlur}
              placeholder="0,00"
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>
              Total investido em PGBL no ano fiscal vigente
            </p>
            {tetoPGBLLive > 0 && tipoDeclaracao !== "simplificada" && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 11, color: "#6B7280" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span>Teto anual: {formatBRL(tetoPGBLLive)} ({formatBRL(tetoPGBLLive / 12)}/mês)</span>
                </div>
                <span style={{
                  fontWeight: 600,
                  color: aproveitamentoPct >= 80 ? "#15803D" : aproveitamentoPct >= 50 ? "#B45309" : "#B91C1C",
                }}>
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
              <strong>Considere VGBL para o excedente:</strong> Você está aportando {formatBRL(excedenteAnual)}/ano acima do teto dedutível de 12% da renda bruta. O excedente não gera benefício fiscal no PGBL — o VGBL pode ser uma alternativa para manter a previdência sem comprometer a dedução.
            </p>
          </div>
        )}
        {excedenteAnual > 0 && tipoDeclaracao === "simplificada" && (
          <div style={{ marginTop: 12, background: "#FEF3C7", border: "0.5px solid #FCD34D", borderLeft: "4px solid #B45309", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <i className="ti ti-alert-triangle" style={{ color: "#B45309", fontSize: 14, marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "#92400E", margin: 0, lineHeight: 1.5 }}>
              <strong>Atenção: PGBL sem benefício na simplificada:</strong> Na declaração simplificada, o PGBL não gera dedução fiscal. Além disso, o aporte de {formatBRL(excedenteAnual)}/ano está acima do teto de 12% da renda bruta. O VGBL pode ser mais adequado ao seu perfil.
            </p>
          </div>
        )}
      </div>

      {/* ── CARD: Espaço Disponível para Dedução PGBL ────────────────────── */}
      {tipoDeclaracao === "completa" && renda.value > 0 && (
        <div style={{
          background: "#F0F7FF",
          border: "1px solid #BFDBFE",
          borderRadius: 12,
          padding: "16px 20px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF", marginBottom: 14 }}>
            Espaço disponível para dedução PGBL
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {/* Teto anual */}
            <div style={{ background: "white", borderRadius: 8, padding: "12px 14px", border: "0.5px solid #E5E7EB" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>Teto PGBL (12%)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                {fmtBRLInt(tetoPGBLLive)}
              </div>
              <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>no ano</div>
            </div>

            {/* Já investido */}
            <div style={{ background: "white", borderRadius: 8, padding: "12px 14px", border: "0.5px solid #E5E7EB" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>Já investido</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: jaInvestidoAno > tetoPGBLLive ? "#B91C1C" : "#111827" }}>
                {fmtBRLInt(jaInvestidoAno)}
              </div>
              <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>em {new Date().getFullYear()}</div>
            </div>

            {/* Espaço restante */}
            <div style={{
              background: espacoDisponivel > 0 ? "#F0FDF4" : "#FEF2F2",
              borderRadius: 8,
              padding: "12px 14px",
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

          {/* Sugestão mensal */}
          {espacoDisponivel > 0 && mesesRestantes > 0 && (
            <div style={{
              marginTop: 12,
              padding: "10px 14px",
              background: "white",
              borderRadius: 8,
              border: "0.5px solid #BFDBFE",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
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

          {/* Aviso teto atingido */}
          {espacoDisponivel <= 0 && (
            <div style={{
              marginTop: 12,
              padding: "10px 14px",
              background: "#FEF2F2",
              borderRadius: 8,
              border: "0.5px solid #FECACA",
              fontSize: 11,
              color: "#B91C1C",
            }}>
              O cliente já atingiu ou ultrapassou o teto de dedução do PGBL para {new Date().getFullYear()}.
              Contribuições adicionais não serão dedutíveis e devem ser direcionadas ao VGBL.
            </div>
          )}
        </div>
      )}

      {sim && (
        <>
          {/* ── CARD 4: Resultado ─────────────────────────────────────────── */}
          <div style={cardStyle("")}>
            {cardHeader("ti-balance", "Resultado")}

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
                  {metricBlock("Base de Cálculo",  formatBRL(sim.baseSemPGBL))}
                  {metricBlock("Imposto Devido",    formatBRL(sim.irSemPGBL), "#B91C1C")}
                  {metricBlock("Alíquota Efetiva",  sim.aliqEfetivaSem.toFixed(2) + "%")}
                </div>
                {resultCard(sim.resultadoSem)}
              </div>

              {/* Com PGBL — oculto na simplificada */}
              {tipoDeclaracao !== "simplificada" && (
                <div style={{ background: "#F0FDF4", border: "0.5px solid #BBF7D0", borderRadius: 10, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <i className="ti ti-trending-down" style={{ fontSize: 16, color: "#15803D" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>Com PGBL</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                    {metricBlock("Nova Base",             formatBRL(sim.baseComPGBL))}
                    {metricBlock("Novo Imposto",           formatBRL(sim.irComPGBL), "#15803D")}
                    {metricBlock("Nova Alíquota Efetiva",  sim.aliqEfetivaCom.toFixed(2) + "%")}
                  </div>
                  {resultCard(sim.resultadoCom)}
                </div>
              )}
            </div>

          </div>

          {/* ── CARD 5: Gráfico Comparativo ──────────────────────────────── */}
          {sim.irSemPGBL > 0 && (
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
                <BarChart
                  data={dadosGrafico}
                  margin={{ top: 20, right: 20, bottom: 0, left: 20 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                    tickFormatter={(v: unknown) => {
                      const n = Number(v);
                      return n >= 1000 ? `R$ ${(n / 1000).toFixed(0)}k` : `R$ ${n}`;
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    formatter={(v: unknown) => [fmtBRLInt(Number(v)), ""]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid #E5E7EB" }}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {dadosGrafico.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                    <LabelList
                      dataKey="valor"
                      position="top"
                      formatter={(v: unknown) => fmtBRLInt(Number(v))}
                      style={{ fontSize: 11, fill: "#374151" }}
                    />
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
          ) : projecao.length > 0 ? (
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
                <LineChart data={projecao} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
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
                      name === "semPGBL" ? "Sem PGBL" : "Com PGBL + restituição",
                    ]}
                    labelFormatter={(v: unknown) => `Idade: ${v} anos`}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid #E5E7EB" }}
                  />
                  <Line type="monotone" dataKey="semPGBL" stroke="#B91C1C" strokeWidth={2} dot={false} name="semPGBL" />
                  <Line type="monotone" dataKey="comPGBL" stroke="#15803D" strokeWidth={2} dot={false} name="comPGBL" />
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
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatBRL(sim.economia)}</p>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: "2px 0 0" }}>× {nAnos} anos + juros compostos</p>
                </div>
              </div>

              {sim.economia > 0 && (
                <div style={{ marginTop: 12, background: "#F0FDF4", border: "0.5px solid #BBF7D0", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <i className="ti ti-sparkles" style={{ fontSize: 15, color: "#15803D" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#15803D" }}>O Poder da Eficiência Tributária</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#14532D", margin: 0, lineHeight: 1.6 }}>
                    Ao contribuir <strong>{formatBRL(sim.aporteEfetivo / 12)}/mês</strong> em PGBL,
                    você economiza <strong>{formatBRL(sim.economia)}/ano</strong> no IR.
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
        R$ 5.000/mês. PGBL: dedução de até 12% da renda bruta na declaração completa. IR no resgate: alíquota
        regressiva de 15% (prazo &gt; 720 dias).
      </p>
    </div>
  );
}
