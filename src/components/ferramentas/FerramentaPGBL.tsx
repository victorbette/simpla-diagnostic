import { useState, useMemo, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  LabelList, ResponsiveContainer, Cell,
} from "recharts";
import type { FinancialPlan } from "@/types/financialPlanning";
import { formatBRL, DEDUCAO_DEPENDENTE, TETO_INSS_2026, calcularINSSMensal } from "@/lib/tax";
import { simularDeclaracaoIRPF } from "@/lib/simularDeclaracao";
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
  const possuiPGBL = possuiPrevidencia &&
    (tipoPrevidencia === "pgbl" || tipoPrevidencia === "ambos");

  const tipoDecl = fiscal?.tipoDeclaracao ?? "nao_sei";

  const renda    = useCurrencyInput(rendaAnualBruta);
  const irrf     = useCurrencyInput(0);
  const despesas = useCurrencyInput(0);
  const inss     = useCurrencyInput(inssAnualCalc);
  const [dependentes, setDependentes] = useState(String(numDependentes));

  useEffect(() => {
    renda.set(rendaAnualBruta);
    inss.set(inssAnualCalc);
    setDependentes(String(numDependentes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sim = useMemo(() => {
    if (renda.value <= 0) return null;
    return simularDeclaracaoIRPF({
      rendaBruta:  renda.value,
      irrf:        irrf.value,
      despesas:    despesas.value,
      dependentes: Math.max(0, parseInt(dependentes) || 0),
      inss:        inss.value,
    });
  }, [renda.value, irrf.value, despesas.value, dependentes, inss.value]);

  const chartData = sim ? [
    { name: "Sem PGBL", valor: sim.irSemPGBL },
    { name: "Com PGBL", valor: sim.irComPGBL },
  ] : [];

  function handleSave() {
    if (!sim || !onSave) return;
    onSave({
      rendaAnual:             renda.value,
      tetoPGBLAnual:          sim.tetoPGBL,
      aporteAnual:            sim.tetoPGBL,
      irComPGBL:              sim.irComPGBL,
      irSemPGBL:              sim.irSemPGBL,
      economiaAnual:          sim.economia,
      espacoDisponivelMensal: 0,
      aproveitandoTeto:       true,
    });
    onClose?.();
  }

  // ── Style helpers ─────────────────────────────────────────────────────────────

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

  function metricBlock(label: string, value: string, color = "#111827") {
    return (
      <div style={{ backgroundColor: "#F8FAFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px 14px" }}>
        <p style={{ ...labelStyle, marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 16, fontWeight: 700, color, margin: 0 }}>{value}</p>
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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Card 1 — Dados da Declaração */}
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
            <input
              type="text"
              value={renda.display}
              onChange={renda.onChange}
              onBlur={renda.onBlur}
              placeholder="0,00"
              style={inputStyle}
            />
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
            <input
              type="number"
              min={0}
              max={10}
              value={dependentes}
              onChange={(e) => setDependentes(e.target.value)}
              style={inputStyle}
            />
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
              {isINSSCalculado
                ? `Teto 2026: ${formatBRL(TETO_INSS_2026 * 12)}/ano`
                : "Informe o INSS pago"}
            </p>
          </div>

        </div>
      </div>

      {/* Banners de previdência */}

      {/* VGBL + completa → âmbar: oportunidade de migrar para PGBL */}
      {possuiPrevidencia && tipoPrevidencia === "vgbl" && tipoDecl === "completa" && (
        <div style={{ background: "#FEF3C7", border: "0.5px solid #FCD34D", borderLeft: "4px solid #B45309", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#92400E" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />
            Cliente possui apenas VGBL
          </div>
          O VGBL não permite dedução no Imposto de Renda. Esta simulação mostra quanto o cliente
          poderia economizar adicionando um PGBL.{" "}
          Limite disponível: <strong>{formatBRL(rendaMensalBruta * 12 * 0.12 / 12)}/mês</strong>
        </div>
      )}

      {/* PGBL + simplificada → âmbar: PGBL não está sendo aproveitado */}
      {possuiPGBL && tipoDecl === "simplificada" && (
        <div style={{ background: "#FEF3C7", border: "0.5px solid #FCD34D", borderLeft: "4px solid #B45309", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#92400E" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />
            PGBL na Declaração Simplificada
          </div>
          O PGBL não gera benefício fiscal na declaração simplificada. Avaliar migração para declaração
          completa para aproveitar a dedução de até{" "}
          <strong>{formatBRL(rendaMensalBruta * 12 * 0.12 / 12)}/mês</strong>.
        </div>
      )}

      {/* PGBL ativo + declaração correta → verde */}
      {possuiPGBL && tipoDecl !== "simplificada" && (
        <div style={{ background: "#DCFCE7", border: "0.5px solid #86EFAC", borderLeft: "4px solid #15803D", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#14532D" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            <i className="ti ti-circle-check" style={{ marginRight: 6 }} />
            Cliente possui PGBL ativo
          </div>
          Saldo atual: <strong>{formatBRL(saldoPrevidencia)}</strong>
          {tipoPrevidencia === "ambos" && (
            <span style={{ marginLeft: 8, color: "#B45309" }}>· Também possui VGBL (não deduz no IR)</span>
          )}
        </div>
      )}

      {/* Sem previdência → azul */}
      {!possuiPrevidencia && (
        <div style={{ background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderLeft: "4px solid #2563EB", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#1E40AF" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
            Cliente sem previdência privada
          </div>
          Oportunidade de diferimento fiscal de até{" "}
          <strong>{formatBRL(rendaMensalBruta * 12 * 0.12 / 12)}/mês</strong>{" "}
          com PGBL
          {tipoDecl === "completa"
            ? " na declaração completa."
            : tipoDecl === "simplificada"
              ? " (avaliar migração para declaração completa)."
              : "."}
        </div>
      )}

      {sim && (
        <>
          {/* Card 2 — Cenário Sem PGBL */}
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

          {/* Card 3 — Cenário Com PGBL */}
          <div style={cardStyle("#15803D", "#F0FDF4")}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <i className="ti ti-trending-down" style={{ fontSize: 18, color: "#15803D" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Cenário Otimizado (Com PGBL)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "#DCFCE7", borderRadius: 8, marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 13, color: "#15803D" }}>Aporte PGBL (12% da renda):</span>
                <p style={{ fontSize: 11, color: "#15803D", opacity: 0.8, margin: "2px 0 0" }}>{formatBRL(sim.tetoPGBL / 12)}/mês</p>
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#15803D" }}>{formatBRL(sim.tetoPGBL)}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
              {metricBlock("Nova Base",          formatBRL(sim.baseComPGBL))}
              {metricBlock("Novo Imposto",        formatBRL(sim.irComPGBL), "#15803D")}
              {metricBlock("Nova Alíquota Efetiva", sim.aliqEfetivaCom.toFixed(2) + "%")}
            </div>
            {resultCard(sim.resultadoCom)}
          </div>

          {/* Banner Economia */}
          {sim.economia > 0 && (
            <div style={{ backgroundColor: "#DCFCE7", border: "0.5px solid #86EFAC", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
              <i className="ti ti-bolt" style={{ fontSize: 24, color: "#15803D", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#15803D", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>
                  Economia Tributária Gerada
                </p>
                <p style={{ fontSize: 28, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatBRL(sim.economia)}</p>
                <p style={{ fontSize: 13, color: "#15803D", margin: "2px 0 0" }}>
                  por ano · {formatBRL(sim.economia / 12)}/mês
                </p>
              </div>
            </div>
          )}

          {/* Gráfico Comparativo */}
          <div style={cardStyle("#2563EB")}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <i className="ti ti-chart-bar" style={{ fontSize: 18, color: "#2563EB" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Comparativo de Imposto Devido</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={chartData}
                barCategoryGap="40%"
                margin={{ top: 28, right: 20, left: 20, bottom: 8 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
                  }
                  tick={{ fontSize: 11 }}
                  width={64}
                />
                <Tooltip formatter={(v: unknown) => [formatBRL(Number(v)), "Imposto"]} />
                <Bar dataKey="valor" maxBarSize={100} radius={[4, 4, 0, 0] as [number, number, number, number]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#B91C1C" : "#15803D"} />
                  ))}
                  <LabelList
                    dataKey="valor"
                    position="top"
                    formatter={(v: unknown) => formatBRL(Number(v))}
                    style={{ fontSize: 11, fill: "#374151", fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Card Diagnóstico */}
          {sim.economia > 0 && (
            <div style={cardStyle("#15803D", "#F0FDF4")}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <i className="ti ti-sparkles" style={{ fontSize: 18, color: "#15803D" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#15803D" }}>O Poder da Eficiência Tributária</span>
              </div>
              <p style={{ fontSize: 13, color: "#14532D", margin: 0, lineHeight: 1.6 }}>
                Ao realocar <strong>{formatBRL(sim.tetoPGBL)}</strong> para a sua aposentadoria via PGBL,
                você reduz a base de cálculo e força a Receita Federal a devolver{" "}
                <strong>{formatBRL(sim.economia)}</strong> do imposto pago. Isso equivale a{" "}
                <strong>{formatBRL(sim.economia / 12)}/mês</strong> reinvestidos na sua aposentadoria.
              </p>
            </div>
          )}
        </>
      )}

      {/* Salvar */}
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

      {/* Nota informativa */}
      <p style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.5, margin: 0, textAlign: "center" }}>
        Cálculo baseado na tabela oficial da Receita Federal 2026. Inclui redutor de isenção para rendas até
        R$ 5.000/mês. PGBL: dedução de até 12% da renda bruta na declaração completa. IR no resgate: alíquota
        regressiva de 15% (prazo &gt; 720 dias).
      </p>
    </div>
  );
}
