import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList,
} from "recharts";
import type { FinancialPlan } from "@/types/financialPlanning";
import { formatBRL, DEDUCAO_DEPENDENTE, TETO_INSS_2026, calcularINSSMensal } from "@/lib/tax";
import { simularDeclaracaoIRPF, calcularProjecaoPatrimonio } from "@/lib/simularDeclaracao";
import { useCurrencyInput } from "@/hooks/useCurrencyInput";

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
  inputIrrf?: number;
  inputDespesas?: number;
  inputDependentes?: number;
  inputInssAnual?: number;
  inputAporteMensalPGBL?: number;
  inputSaldoPrevidencia?: number;
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
  const dc     = plan?.dadosCliente;
  const fiscal = plan?.fiscal;

  const idadeAtual = dc?.dataNascimento
    ? Math.floor(
        (Date.now() - new Date(dc.dataNascimento).getTime()) /
        (365.25 * 24 * 3600 * 1000)
      )
    : 0;
  const idadeMeta = plan?.planejamentoIF?.idadeMeta ?? 60;
  const nAnos     = idadeAtual > 0 ? Math.max(1, idadeMeta - idadeAtual) : 0;

  const rendaMensalBruta =
    (Number(dc?.rendaMensal) || 0) +
    (dc?.possuiImovelRenda ? (Number(dc?.rendaImovelMensal) || 0) : 0);
  const rendaAnualBruta = rendaMensalBruta * 12;

  const isINSSCalculado =
    dc?.tipoTrabalho === "clt" || dc?.tipoTrabalho === "concursado";
  const inssAnualCalc =
    calcularINSSMensal(rendaMensalBruta, dc?.tipoTrabalho ?? "") * 12;
  const numDependentes = dc?.filhos?.length ?? 0;

  const possuiPrevidencia = dc?.possuiPrevidencia ?? false;
  const tipoPrevidencia   = dc?.tipoPrevidencia ?? null;
  const saldoPrevidencia  = Number(dc?.saldoPrevidencia) || 0;
  const temPGBL  = possuiPrevidencia && (tipoPrevidencia === "pgbl" || tipoPrevidencia === "ambos");
  const tetoPGBL = rendaAnualBruta * 0.12;

  const [tipoDeclaracao, setTipoDeclaracao] = useState<string>(
    savedResult?.tipoDeclaracao ?? fiscal?.tipoDeclaracao ?? "nao_sei"
  );

  const renda        = useCurrencyInput(savedResult?.inputRendaAnualBruta ?? rendaAnualBruta);
  const irrf         = useCurrencyInput(savedResult?.inputIrrf ?? 0);
  const despesas     = useCurrencyInput(savedResult?.inputDespesas ?? 0);
  const inss         = useCurrencyInput(savedResult?.inputInssAnual ?? inssAnualCalc);
  const aporteMensal = useCurrencyInput(savedResult?.inputAporteMensalPGBL ?? (temPGBL ? 0 : tetoPGBL / 12));
  const saldoAtual   = useCurrencyInput(savedResult?.inputSaldoPrevidencia ?? saldoPrevidencia);
  const [dependentes, setDependentes] = useState(String(savedResult?.inputDependentes ?? numDependentes));
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (savedResult) return;
    renda.set(rendaAnualBruta);
    inss.set(inssAnualCalc);
    aporteMensal.set(temPGBL ? 0 : rendaAnualBruta * 0.12 / 12);
    saldoAtual.set(saldoPrevidencia);
    setDependentes(String(numDependentes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sim = useMemo(() => {
    if (renda.value <= 0) return null;
    const aporteAnual = aporteMensal.value > 0 ? aporteMensal.value * 12 : undefined;
    return simularDeclaracaoIRPF({
      rendaBruta:     renda.value,
      irrf:           irrf.value,
      despesas:       despesas.value,
      dependentes:    Math.max(0, parseInt(dependentes) || 0),
      inss:           inss.value,
      aporteAnual,
      tipoDeclaracao,
    });
  }, [renda.value, irrf.value, despesas.value, dependentes, inss.value, aporteMensal.value, tipoDeclaracao]);

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

  const aporteAnualPGBL = aporteMensal.value * 12;
  const tetoPGBLLive    = sim?.tetoPGBL ?? 0;
  const aproveitamentoPct = tetoPGBLLive > 0
    ? Math.min(100, Math.round((aporteAnualPGBL / tetoPGBLLive) * 100))
    : 0;
  const excedenteAnual   = tetoPGBLLive > 0 ? Math.max(0, aporteAnualPGBL - tetoPGBLLive) : 0;
  const espacoDisponivel = tetoPGBLLive > 0 ? Math.max(0, tetoPGBLLive - aporteAnualPGBL) : 0;

  function handleSave() {
    if (!sim || !onSave) return;
    onSave({
      tipoDeclaracao,
      rendaAnual:             renda.value,
      tetoPGBLAnual:          sim.tetoPGBL,
      aporteAnual:            sim.aporteEfetivo,
      irComPGBL:              sim.irComPGBL,
      irSemPGBL:              sim.irSemPGBL,
      economiaAnual:          sim.economia,
      espacoDisponivelMensal: Math.max(0, (sim.tetoPGBL - sim.aporteEfetivo) / 12),
      aproveitandoTeto:       sim.aporteEfetivo >= sim.tetoPGBL,
      inputRendaAnualBruta:   renda.value,
      inputIrrf:              irrf.value,
      inputDespesas:          despesas.value,
      inputDependentes:       Math.max(0, parseInt(dependentes) || 0),
      inputInssAnual:         inss.value,
      inputAporteMensalPGBL:  aporteMensal.value,
      inputSaldoPrevidencia:  saldoAtual.value,
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── CARD 1: Tipo de Declaração ─────────────────────────────────────── */}
      <div style={cardStyle("")}>
        {cardHeader("ti-file-text", "Tipo de Declaração IR")}
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
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={labelStyle}>Renda Bruta Anual (R$)</span>
              {rendaAnualBruta > 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, backgroundColor: "#DBEAFE", color: "#1E40AF", flexShrink: 0 }}>
                  Da coleta
                </span>
              )}
            </div>
            <input type="text" value={renda.display} onChange={renda.onChange} onBlur={renda.onBlur} placeholder="0,00" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Renda anual + renda de imóveis</p>
          </div>

          <div>
            <span style={labelStyle}>IRRF Retido na Fonte (R$)</span>
            <input type="text" value={irrf.display} onChange={irrf.onChange} onBlur={irrf.onBlur} placeholder="0,00" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Informes de rendimentos do empregador</p>
          </div>

          <div>
            <span style={labelStyle}>Despesas Dedutíveis (R$)</span>
            <input type="text" value={despesas.display} onChange={despesas.onChange} onBlur={despesas.onBlur} placeholder="0,00" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Saúde, educação, pensão alimentícia</p>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={labelStyle}>Dependentes</span>
              {numDependentes > 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, backgroundColor: "#DBEAFE", color: "#1E40AF", flexShrink: 0 }}>
                  Da coleta
                </span>
              )}
            </div>
            <input type="number" min={0} max={10} value={dependentes} onChange={(e) => setDependentes(e.target.value)} style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>{formatBRL(DEDUCAO_DEPENDENTE)}/dep/ano deduzidos</p>
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={labelStyle}>INSS Anual (R$)</span>
              {isINSSCalculado && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, backgroundColor: "#DCFCE7", color: "#15803D", flexShrink: 0 }}>
                  Calculado
                </span>
              )}
            </div>
            <input
              type="text"
              value={inss.display}
              onChange={inss.onChange}
              onBlur={inss.onBlur}
              placeholder="0,00"
              readOnly={isINSSCalculado}
              style={{ ...inputStyle, backgroundColor: isINSSCalculado ? "#F9FAFB" : "white" }}
            />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>
              {isINSSCalculado ? `Teto 2026: ${formatBRL(TETO_INSS_2026 * 12)}/ano` : "Informe o INSS pago"}
            </p>
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={labelStyle}>Saldo Atual na Previdência (R$)</span>
              {saldoPrevidencia > 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, backgroundColor: "#DBEAFE", color: "#1E40AF", flexShrink: 0 }}>
                  Da coleta
                </span>
              )}
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
            <span style={labelStyle}>Aporte Mensal em Previdência (PGBL) (R$)</span>
            <input
              type="text"
              value={aporteMensal.display}
              onChange={aporteMensal.onChange}
              onBlur={aporteMensal.onBlur}
              placeholder="0,00"
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>
              Valor que contribui mensalmente ao PGBL
            </p>
            {tetoPGBLLive > 0 && tipoDeclaracao !== "simplificada" && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#6B7280" }}>
                <span>Teto anual: {formatBRL(tetoPGBLLive)} ({formatBRL(tetoPGBLLive / 12)}/mês)</span>
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
                Aporte acima do teto dedutível ({formatBRL(tetoPGBLLive / 12)}/mês)
              </p>
            )}
            {tipoDeclaracao === "completa" && espacoDisponivel > 0 && (
              <p style={{ fontSize: 11, color: "#15803D", margin: "4px 0 0" }}>
                Espaço disponível para deduzir: {formatBRL(espacoDisponivel / 12)}/mês
              </p>
            )}
          </div>

        </div>

        {excedenteAnual > 0 && tipoDeclaracao === "completa" && (
          <div style={{ marginTop: 12, background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderLeft: "4px solid #2563EB", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <i className="ti ti-info-circle" style={{ color: "#2563EB", fontSize: 14, marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "#1E40AF", margin: 0, lineHeight: 1.5 }}>
              <strong>Considere VGBL para o excedente:</strong> Você está aportando {formatBRL(excedenteAnual / 12)}/mês acima do teto dedutível de 12% da renda bruta. O excedente não gera benefício fiscal no PGBL — o VGBL pode ser uma alternativa para manter a previdência sem comprometer a dedução.
            </p>
          </div>
        )}
        {excedenteAnual > 0 && tipoDeclaracao === "simplificada" && (
          <div style={{ marginTop: 12, background: "#FEF3C7", border: "0.5px solid #FCD34D", borderLeft: "4px solid #B45309", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <i className="ti ti-alert-triangle" style={{ color: "#B45309", fontSize: 14, marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "#92400E", margin: 0, lineHeight: 1.5 }}>
              <strong>Atenção: PGBL sem benefício na simplificada:</strong> Na declaração simplificada, o PGBL não gera dedução fiscal. Além disso, o aporte de {formatBRL(excedenteAnual / 12)}/mês está acima do teto de 12% da renda bruta. O VGBL pode ser mais adequado ao seu perfil.
            </p>
          </div>
        )}
      </div>

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
                    <div style={{ fontSize: 10, color: d.fill, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                      {d.label}
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
                  <Tooltip
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
                  <Tooltip
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

      {/* ── Salvar ────────────────────────────────────────────────────────── */}
      {onSave && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 0 0", marginTop: 8, borderTop: "0.5px solid #E5E7EB" }}>
          <button
            onClick={handleSave}
            disabled={!sim || salvo}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              backgroundColor: salvo ? "#15803D" : (sim ? "#2563EB" : "#D1D5DB"),
              color: "white", border: "none", borderRadius: 8,
              padding: "8px 20px", fontSize: 13, fontWeight: 600,
              cursor: sim && !salvo ? "pointer" : "not-allowed",
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
