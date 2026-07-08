import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from "recharts";
import type { FinancialPlan } from "@/types/financialPlanning";
import { formatBRL, DEDUCAO_DEPENDENTE, TETO_INSS_2026, calcularINSSMensal } from "@/lib/tax";
import { simularDeclaracaoIRPF, calcularProjecaoPatrimonio } from "@/lib/simularDeclaracao";
import { useCurrencyInput } from "@/hooks/useCurrencyInput";

export interface SavedPGBLResult {
  rendaAnual: number;
  tetoPGBLAnual: number;
  aporteAnual: number;
  irComPGBL: number;
  irSemPGBL: number;
  economiaAnual: number;
  espacoDisponivelMensal: number;
  aproveitandoTeto: boolean;
}

interface Props {
  plan: FinancialPlan;
  clientName?: string;
  onClose?: () => void;
  onSave?: (r: SavedPGBLResult) => void;
}

export function FerramentaPGBL({ plan, onClose, onSave }: Props) {
  const dc     = plan?.dadosCliente;
  const fiscal = plan?.fiscal;
  const plIF   = plan?.planejamentoIF;
  const idadeAtual = plIF?.idadeAtual ?? 35;
  const nAnos      = Math.max(1, (plIF?.idadeMeta ?? 65) - idadeAtual);

  // ── Renda ──────────────────────────────────────────────────────────────────
  const rendaMensalBruta =
    (Number(dc?.rendaMensal) || 0) +
    (dc?.possuiImovelRenda ? (Number(dc?.rendaImovelMensal) || 0) : 0);
  const rendaAnualBruta = rendaMensalBruta * 12;

  // ── INSS / Dependentes ─────────────────────────────────────────────────────
  const isINSSCalculado =
    dc?.tipoTrabalho === "clt" || dc?.tipoTrabalho === "concursado";
  const inssAnualCalc =
    calcularINSSMensal(rendaMensalBruta, dc?.tipoTrabalho ?? "") * 12;
  const numDependentes = dc?.filhos?.length ?? 0;

  // ── Previdência ────────────────────────────────────────────────────────────
  const possuiPrevidencia = dc?.possuiPrevidencia ?? false;
  const tipoPrevidencia   = dc?.tipoPrevidencia ?? null;
  const saldoPrevidencia  = Number(dc?.saldoPrevidencia) || 0;
  const temPGBL  = possuiPrevidencia && (tipoPrevidencia === "pgbl" || tipoPrevidencia === "ambos");
  const temVGBL  = possuiPrevidencia && (tipoPrevidencia === "vgbl" || tipoPrevidencia === "ambos");
  const semPrevidencia = !possuiPrevidencia;
  const tetoPGBL = rendaAnualBruta * 0.12;

  // ── Fiscal ─────────────────────────────────────────────────────────────────
  const tipoDecl = fiscal?.tipoDeclaracao ?? "nao_sei";

  // ── Inputs ─────────────────────────────────────────────────────────────────
  const renda       = useCurrencyInput(rendaAnualBruta);
  const irrf        = useCurrencyInput(0);
  const despesas    = useCurrencyInput(0);
  const inss        = useCurrencyInput(inssAnualCalc);
  const aporteMensal = useCurrencyInput(temPGBL ? 0 : tetoPGBL / 12);
  const [dependentes, setDependentes] = useState(String(numDependentes));

  useEffect(() => {
    renda.set(rendaAnualBruta);
    inss.set(inssAnualCalc);
    aporteMensal.set(temPGBL ? 0 : rendaAnualBruta * 0.12 / 12);
    setDependentes(String(numDependentes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Simulação principal ────────────────────────────────────────────────────
  const sim = useMemo(() => {
    if (renda.value <= 0) return null;
    const aporteAnual = aporteMensal.value > 0 ? aporteMensal.value * 12 : undefined;
    return simularDeclaracaoIRPF({
      rendaBruta:  renda.value,
      irrf:        irrf.value,
      despesas:    despesas.value,
      dependentes: Math.max(0, parseInt(dependentes) || 0),
      inss:        inss.value,
      aporteAnual,
    });
  }, [renda.value, irrf.value, despesas.value, dependentes, inss.value, aporteMensal.value]);

  // ── Simulação ao teto (comparação para quem tem PGBL com aporte < teto) ───
  const simTeto = useMemo(() => {
    if (!temPGBL || renda.value <= 0 || aporteMensal.value <= 0) return null;
    return simularDeclaracaoIRPF({
      rendaBruta:  renda.value,
      irrf:        irrf.value,
      despesas:    despesas.value,
      dependentes: Math.max(0, parseInt(dependentes) || 0),
      inss:        inss.value,
    });
  }, [temPGBL, renda.value, irrf.value, despesas.value, dependentes, inss.value, aporteMensal.value]);

  const projecao = useMemo(() => {
    if (!sim || sim.economia <= 0) return [];
    return calcularProjecaoPatrimonio({
      aporteAnualPGBL: sim.aporteEfetivo,
      economiaAnual:   sim.economia,
      nAnos,
      idadeAtual,
      saldoInicial:    saldoPrevidencia,
    });
  }, [sim, nAnos, idadeAtual, saldoPrevidencia]);

  const ultimoPonto = projecao[projecao.length - 1];
  const diferencaFinal = ultimoPonto ? ultimoPonto.comPGBL - ultimoPonto.semPGBL : 0;

  function handleSave() {
    if (!sim || !onSave) return;
    onSave({
      rendaAnual:             renda.value,
      tetoPGBLAnual:          sim.tetoPGBL,
      aporteAnual:            sim.aporteEfetivo,
      irComPGBL:              sim.irComPGBL,
      irSemPGBL:              sim.irSemPGBL,
      economiaAnual:          sim.economia,
      espacoDisponivelMensal: Math.max(0, (sim.tetoPGBL - sim.aporteEfetivo) / 12),
      aproveitandoTeto:       sim.aporteEfetivo >= sim.tetoPGBL,
    });
    onClose?.();
  }

  // ── Style helpers ──────────────────────────────────────────────────────────
  const cardStyle = (_borderColor: string, bg = "white"): React.CSSProperties => ({
    backgroundColor: bg,
    border: "0.5px solid #E5E7EB",
    borderRadius: 12,
    padding: "20px 24px",
  });

  const inputStyle: React.CSSProperties = {
    border: "1px solid #BFDBFE", borderRadius: 8,
    padding: "8px 12px", fontSize: 14, width: "100%",
    outline: "none", fontFamily: "inherit",
    boxSizing: "border-box", color: "#111827",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "#6B7280",
    textTransform: "uppercase", letterSpacing: "0.04em",
    display: "block", marginBottom: 4,
  };

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
      <div style={{ backgroundColor: "white", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#6B7280" }}>Resultado Final</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: aPagar ? "#B91C1C" : "#15803D" }}>
          {aPagar
            ? `A pagar: ${formatBRL(resultado)}`
            : `A restituir: ${formatBRL(Math.abs(resultado))}`}
        </span>
      </div>
    );
  }

  // ── Barra de aproveitamento ────────────────────────────────────────────────
  const aporteAnualEstimado = aporteMensal.value > 0
    ? aporteMensal.value * 12
    : (saldoPrevidencia > 0 ? Math.min(saldoPrevidencia * 0.1, tetoPGBL) : 0);
  const percentAproveitamento = tetoPGBL > 0
    ? Math.min(100, (aporteAnualEstimado / tetoPGBL) * 100)
    : 0;

  // ── Label/hint do campo aporte ─────────────────────────────────────────────
  const aporteLabel = temPGBL
    ? "Aporte Mensal PGBL Atual (R$)"
    : "Aporte Mensal PGBL Simulado (R$)";
  const aporteHint = temPGBL
    ? "Informe o valor que já contribui mensalmente"
    : semPrevidencia
      ? "Sugestão: aproveitar o teto disponível"
      : "Simule quanto aportaria em um novo PGBL";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Card 0: Situação Atual da Previdência ─────────────────────────── */}
      <div style={cardStyle("#2563EB")}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <i className="ti ti-piggy-bank" style={{ fontSize: 18, color: "#2563EB" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Situação Atual da Previdência</span>
        </div>

        {/* PGBL + VGBL (ambos) */}
        {temPGBL && temVGBL && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
              <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ ...labelStyle, marginBottom: 6 }}>PGBL</p>
                <span style={{ fontSize: 13, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: "#DCFCE7", color: "#15803D" }}>Possui</span>
              </div>
              <div style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ ...labelStyle, marginBottom: 6 }}>VGBL</p>
                <span style={{ fontSize: 13, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: "#F3F4F6", color: "#6B7280" }}>Possui</span>
              </div>
              {metricBlock("Saldo Total", formatBRL(saldoPrevidencia))}
            </div>
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "12px 14px" }}>
              <p style={{ fontSize: 13, color: "#14532D", margin: 0 }}>
                Você possui ambos os tipos de previdência. Apenas o PGBL gera dedução no IR.
                A simulação abaixo considera apenas o benefício do PGBL.
              </p>
            </div>
          </>
        )}

        {/* Apenas PGBL */}
        {temPGBL && !temVGBL && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
              <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ ...labelStyle, marginBottom: 6 }}>Tipo</p>
                <span style={{ fontSize: 13, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: "#DCFCE7", color: "#15803D" }}>PGBL</span>
              </div>
              {metricBlock("Saldo Atual", formatBRL(saldoPrevidencia))}
              {metricBlock("Teto PGBL", `${formatBRL(tetoPGBL)}/ano`)}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#6B7280" }}>
                  {aporteMensal.value > 0 ? "Aproveitamento do teto PGBL" : "Aproveitamento estimado do teto PGBL"}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#15803D" }}>{percentAproveitamento.toFixed(0)}%</span>
              </div>
              <div style={{ background: "#E5E7EB", borderRadius: 999, height: 8 }}>
                <div style={{ background: "#15803D", width: `${percentAproveitamento}%`, borderRadius: 999, height: "100%", transition: "width 0.3s" }} />
              </div>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Teto: {formatBRL(tetoPGBL)}/ano</p>
            </div>

            <div style={{ background: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <i className="ti ti-circle-check" style={{ fontSize: 16, color: "#15803D", marginTop: 1, flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: 13, color: "#14532D", margin: "0 0 4px" }}>Você já possui PGBL — ótima decisão!</p>
                  <p style={{ fontSize: 12, color: "#14532D", margin: 0 }}>
                    Verifique abaixo se está aproveitando o limite máximo de dedução disponível
                    ({formatBRL(tetoPGBL / 12)}/mês).
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Apenas VGBL (sem PGBL) */}
        {temVGBL && !temPGBL && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ ...labelStyle, marginBottom: 6 }}>Tipo</p>
                <span style={{ fontSize: 13, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: "#FEF3C7", color: "#B45309" }}>VGBL</span>
              </div>
              {metricBlock("Saldo Atual", formatBRL(saldoPrevidencia))}
            </div>

            <div style={{ background: "#FEF3C7", border: "0.5px solid #FCD34D", borderLeft: "4px solid #B45309", borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#92400E", marginBottom: 6 }}>
                <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />
                VGBL não gera dedução no Imposto de Renda
              </div>
              <p style={{ fontSize: 12, color: "#92400E", margin: 0, lineHeight: 1.6 }}>
                {tipoDecl === "completa"
                  ? <>O VGBL é adequado para declaração simplificada, mas você utiliza a declaração completa. Isso significa que está perdendo a oportunidade de deduzir até <strong>{formatBRL(tetoPGBL)}</strong> por ano ({formatBRL(tetoPGBL / 12)}/mês) da base de cálculo do IR.</>
                  : <>O VGBL não permite dedução na base de cálculo do IR. Com a declaração completa, seria possível deduzir até <strong>{formatBRL(tetoPGBL)}</strong> por ano abrindo um PGBL.</>
                }
              </p>
            </div>

            <div style={{ background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#1E40AF", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-bulb" style={{ color: "#2563EB" }} />
                O que fazer?
              </div>
              <ol style={{ color: "#1E40AF", fontSize: 12, paddingLeft: 20, margin: 0, lineHeight: 1.9 }}>
                <li>Avaliar abertura de um PGBL adicional</li>
                <li>Manter o VGBL existente (já está rendendo)</li>
                <li>Direcionar novos aportes para o PGBL</li>
                <li>Limite disponível para dedução: <strong>{formatBRL(tetoPGBL / 12)}/mês</strong></li>
              </ol>
            </div>
          </>
        )}

        {/* Sem previdência */}
        {semPrevidencia && (
          <div style={{ background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderLeft: "4px solid #2563EB", borderRadius: 8, padding: "16px" }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#1E40AF", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-bulb" style={{ color: "#2563EB" }} />
              Oportunidade identificada
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ backgroundColor: "#DBEAFE", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ ...labelStyle, marginBottom: 4 }}>Limite disponível</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#1E40AF", margin: 0 }}>{formatBRL(tetoPGBL)}</p>
                <p style={{ fontSize: 11, color: "#3B82F6", margin: "2px 0 0" }}>/ano</p>
              </div>
              <div style={{ backgroundColor: "#DBEAFE", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ ...labelStyle, marginBottom: 4 }}>Economia estimada/ano</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#1E40AF", margin: 0 }}>{formatBRL(tetoPGBL * 0.275)}</p>
                <p style={{ fontSize: 11, color: "#3B82F6", margin: "2px 0 0" }}>se na faixa 27,5%</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#1E40AF", margin: "0 0 8px", lineHeight: 1.6 }}>
              Você ainda não possui previdência privada. Com a declaração completa, é possível deduzir
              até <strong>{formatBRL(tetoPGBL / 12)}/mês</strong> em PGBL, gerando uma economia
              fiscal significativa no IR.
            </p>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#2563EB", margin: 0 }}>
              Simule abaixo o impacto do PGBL no seu IR →
            </p>
          </div>
        )}
      </div>

      {/* ── Card 1: Dados da Declaração ───────────────────────────────────── */}
      <div style={cardStyle("#B45309")}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <i className="ti ti-receipt" style={{ fontSize: 18, color: "#B45309" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Dados da Declaração Completa</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>

          {/* Renda Bruta Anual */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
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

          {/* IRRF */}
          <div>
            <span style={labelStyle}>IRRF Retido na Fonte (R$)</span>
            <input type="text" value={irrf.display} onChange={irrf.onChange} onBlur={irrf.onBlur} placeholder="0,00" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Informes de rendimentos do empregador</p>
          </div>

          {/* Despesas */}
          <div>
            <span style={labelStyle}>Despesas Dedutíveis (R$)</span>
            <input type="text" value={despesas.display} onChange={despesas.onChange} onBlur={despesas.onBlur} placeholder="0,00" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Saúde, educação, pensão alimentícia</p>
          </div>

          {/* Dependentes */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
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

          {/* INSS */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={labelStyle}>INSS Anual (R$)</span>
              {isINSSCalculado && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, backgroundColor: "#DCFCE7", color: "#15803D", flexShrink: 0 }}>
                  Calculado
                </span>
              )}
            </div>
            <input type="text" value={inss.display} onChange={inss.onChange} onBlur={inss.onBlur} placeholder="0,00" readOnly={isINSSCalculado} style={{ ...inputStyle, backgroundColor: isINSSCalculado ? "#F9FAFB" : "white" }} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>
              {isINSSCalculado ? `Teto 2026: ${formatBRL(TETO_INSS_2026 * 12)}/ano` : "Informe o INSS pago"}
            </p>
          </div>

          {/* Aporte PGBL */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={labelStyle}>{aporteLabel}</span>
              {!temPGBL && rendaAnualBruta > 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, backgroundColor: "#DCFCE7", color: "#15803D", flexShrink: 0 }}>
                  Sugestão
                </span>
              )}
            </div>
            <input type="text" value={aporteMensal.display} onChange={aporteMensal.onChange} onBlur={aporteMensal.onBlur} placeholder="0,00" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>{aporteHint}</p>
          </div>

        </div>
      </div>

      {sim && (
        <>
          {/* ── Card 2: Cenário Sem PGBL ──────────────────────────────────── */}
          <div style={cardStyle("#B91C1C", "#FFF5F5")}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <i className="ti ti-trending-up" style={{ fontSize: 18, color: "#B91C1C" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Cenário Atual (Sem PGBL)</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
              {metricBlock("Base de Cálculo", formatBRL(sim.baseSemPGBL))}
              {metricBlock("Imposto Devido",  formatBRL(sim.irSemPGBL), "#B91C1C")}
              {metricBlock("Alíquota Efetiva", sim.aliqEfetivaSem.toFixed(2) + "%")}
            </div>
            {resultCard(sim.resultadoSem)}
          </div>

          {/* ── Card 3: Cenário Com PGBL ──────────────────────────────────── */}
          <div style={cardStyle("#15803D", "#F0FDF4")}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <i className="ti ti-trending-down" style={{ fontSize: 18, color: "#15803D" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Cenário Otimizado (Com PGBL)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "#DCFCE7", borderRadius: 8, marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 13, color: "#15803D" }}>
                  {temPGBL && aporteMensal.value > 0 ? "Aporte PGBL mensal:" : "Aporte PGBL (12% da renda):"}
                </span>
                <p style={{ fontSize: 11, color: "#15803D", opacity: 0.8, margin: "2px 0 0" }}>{formatBRL(sim.aporteEfetivo / 12)}/mês</p>
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#15803D" }}>{formatBRL(sim.aporteEfetivo)}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
              {metricBlock("Nova Base",           formatBRL(sim.baseComPGBL))}
              {metricBlock("Novo Imposto",         formatBRL(sim.irComPGBL), "#15803D")}
              {metricBlock("Nova Alíquota Efetiva", sim.aliqEfetivaCom.toFixed(2) + "%")}
            </div>
            {resultCard(sim.resultadoCom)}
          </div>

          {/* ── Banner Economia ───────────────────────────────────────────── */}
          {sim.economia > 0 && (
            <div style={{ backgroundColor: "#DCFCE7", border: "0.5px solid #86EFAC", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <i className="ti ti-bolt" style={{ fontSize: 24, color: "#15803D", flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#15803D", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>
                  Economia Tributária Gerada
                </p>
                <p style={{ fontSize: 28, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatBRL(sim.economia)}</p>
                <p style={{ fontSize: 13, color: "#15803D", margin: "2px 0 8px" }}>
                  por ano · {formatBRL(sim.economia / 12)}/mês
                </p>
                <div style={{ borderTop: "1px solid #BBF7D0", paddingTop: 8 }}>
                  {temPGBL && (
                    <p style={{ fontSize: 12, color: "#14532D", margin: 0, lineHeight: 1.6 }}>
                      {aporteMensal.value > 0
                        ? <>Com o PGBL atual ({formatBRL(aporteMensal.value)}/mês), sua economia fiscal é de <strong>{formatBRL(sim.economia)}/ano</strong>.{simTeto && simTeto.economia > sim.economia && <> Aumentando para o teto de <strong>{formatBRL(simTeto.tetoPGBL / 12)}/mês</strong>, a economia seria de <strong>{formatBRL(simTeto.economia)}/ano</strong>.</>}</>
                        : <>Com PGBL no teto de <strong>{formatBRL(sim.tetoPGBL / 12)}/mês</strong>, sua economia fiscal seria de <strong>{formatBRL(sim.economia)}/ano</strong>. Informe o aporte atual acima para ver sua situação específica.</>
                      }
                    </p>
                  )}
                  {temVGBL && !temPGBL && (
                    <p style={{ fontSize: 12, color: "#14532D", margin: 0, lineHeight: 1.6 }}>
                      Abrindo um PGBL de <strong>{formatBRL(aporteMensal.value)}/mês</strong>,
                      você passaria a economizar <strong>{formatBRL(sim.economia)}/ano</strong> no IR — sem precisar resgatar o VGBL existente.
                    </p>
                  )}
                  {semPrevidencia && (
                    <p style={{ fontSize: 12, color: "#14532D", margin: 0, lineHeight: 1.6 }}>
                      Aportando <strong>{formatBRL(aporteMensal.value)}/mês</strong> em PGBL,
                      você economizaria <strong>{formatBRL(sim.economia)}/ano</strong> no IR e ainda constrói patrimônio para aposentadoria.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Gráfico Patrimônio Acumulado ─────────────────────────────── */}
          {projecao.length > 0 && (
            <div style={cardStyle("#2563EB")}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <i className="ti ti-trending-up" style={{ fontSize: 18, color: "#2563EB" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Comparativo de Patrimônio Acumulado</span>
              </div>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 12px" }}>
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
                      Number(value).toLocaleString("pt-BR", {
                        style: "currency", currency: "BRL",
                        maximumFractionDigits: 0,
                      }),
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
            </div>
          )}

          {/* ── Card Diagnóstico ──────────────────────────────────────────── */}
          {sim.economia > 0 && (
            <div style={cardStyle("#15803D", "#F0FDF4")}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <i className="ti ti-sparkles" style={{ fontSize: 18, color: "#15803D" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#15803D" }}>O Poder da Eficiência Tributária</span>
              </div>
              <p style={{ fontSize: 13, color: "#14532D", margin: 0, lineHeight: 1.6 }}>
                Ao contribuir <strong>{formatBRL(sim.aporteEfetivo / 12)}/mês</strong> em PGBL,
                você economiza <strong>{formatBRL(sim.economia)}/ano</strong> no IR.
                Reinvestindo essa restituição a uma taxa conservadora de IPCA+5% ao ano, a diferença
                acumulada em <strong>{nAnos} anos</strong> é de{" "}
                <strong>{formatBRL(diferencaFinal)}</strong> — o poder dos juros compostos trabalhando ao seu favor.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Salvar ───────────────────────────────────────────────────────── */}
      {onSave && (
        <button
          onClick={handleSave}
          disabled={!sim}
          style={{
            width: "100%",
            backgroundColor: sim ? "#15803D" : "#D1D5DB",
            color: "white", border: "none", borderRadius: 8,
            padding: "12px 0", fontSize: 14, fontWeight: 600,
            cursor: sim ? "pointer" : "not-allowed",
          }}
        >
          Salvar análise
        </button>
      )}

      {/* ── Nota informativa ─────────────────────────────────────────────── */}
      <p style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.5, margin: 0, textAlign: "center" }}>
        Cálculo baseado na tabela oficial da Receita Federal 2026. Inclui redutor de isenção para rendas até
        R$ 5.000/mês. PGBL: dedução de até 12% da renda bruta na declaração completa. IR no resgate: alíquota
        regressiva de 15% (prazo &gt; 720 dias).
      </p>
    </div>
  );
}
