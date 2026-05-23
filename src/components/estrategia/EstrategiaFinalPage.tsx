import { useState } from "react";
import { ArrowLeft, Printer, Download, Save, PieChart as PieChartIcon, Flame, Shield, Receipt, ListChecks } from "lucide-react";
import { toast } from "sonner";
import type { FinancialPlan } from "@/types/financialPlanning";
import {
  PERFIL_LABELS,
  calcularIF,
  calcularSucessorio,
} from "@/types/financialPlanning";
import type { EstrategiaData, AcaoItem } from "./EstrategiaInicialPage";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { formatCurrency } from "@/lib/format";

// ─── Helper components ────────────────────────────────────────────────────────

function metricaItem(label: string, value: string, color = "#000000") {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function statusBadgeLocal(secaoId: string, estrategia: EstrategiaData) {
  const len = estrategia.comentarios[secaoId]?.length ?? 0;
  if (len > 20) return <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 9999, backgroundColor: "#EFF6FF", color: "#2563EB", border: "1px solid #60A5FA" }}>Em revisão</span>;
  return <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 9999, backgroundColor: "#F0F7FF", color: "#6B7280" }}>Pendente</span>;
}

function checklist(label: string, ok: boolean) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 4 }}>
      <span style={{ color: ok ? "#15803D" : "#B91C1C", fontWeight: 700 }}>{ok ? "✓" : "✗"}</span>
      <span style={{ color: ok ? "#111827" : "#9CA3AF" }}>{label}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  estrategia: EstrategiaData;
  resultados: ResultadosEstrategia;
  plan: FinancialPlan;
  clientName: string;
  clientProfile: string | null; // PerfilRisco | null
  onVoltar: () => void;
  onSaveCloud?: (data: EstrategiaData) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EstrategiaFinalPage({
  estrategia,
  resultados,
  plan,
  clientName,
  clientProfile,
  onVoltar,
  onSaveCloud,
}: Props) {
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvo, setUltimoSalvo] = useState<Date | null>(null);

  // ── Print functions ─────────────────────────────────────────────────────────

  const imprimirConsultor = () => {
    document.body.classList.add("print-consultor");
    document.body.classList.remove("print-cliente");
    window.print();
    setTimeout(() => document.body.classList.remove("print-consultor"), 500);
  };

  const imprimirCliente = () => {
    document.body.classList.add("print-cliente");
    document.body.classList.remove("print-consultor");
    window.print();
    setTimeout(() => document.body.classList.remove("print-cliente"), 500);
  };

  const handleSalvar = async () => {
    if (!onSaveCloud) return;
    setSalvando(true);
    try {
      await onSaveCloud(estrategia);
      setUltimoSalvo(new Date());
      toast.success("Estratégia salva!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  // ── Computed values ─────────────────────────────────────────────────────────

  const resultadoIF = calcularIF(plan.planejamentoIF);
  const resultadoSuc = calcularSucessorio(plan.sucessorio);

  const perfilLabel = clientProfile
    ? PERFIL_LABELS[clientProfile as keyof typeof PERFIL_LABELS] ?? "Não definido"
    : "Não definido";

  // Priority sort helper
  const prioridadeOrdem: Record<AcaoItem["prioridade"], number> = { alta: 0, media: 1, baixa: 2 };
  const acoesOrdenadas = [...estrategia.acoes].sort(
    (a, b) => prioridadeOrdem[a.prioridade] - prioridadeOrdem[b.prioridade]
  );

  // ── Section card style helper ───────────────────────────────────────────────

  function areaCard(borderColor: string, children: React.ReactNode) {
    return (
      <div
        className="secao-area"
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: 28,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          borderLeft: `4px solid ${borderColor}`,
        }}
      >
        {children}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 56,
          backgroundColor: "#1E3A8A",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onVoltar}
            style={{
              color: "#3B82F6",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: 0,
            }}
          >
            <ArrowLeft size={14} /> Voltar à revisão
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/logo-si.svg"
              alt="Simpla Invest"
              style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 4 }}
            />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ color: "#FFFFFF", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15 }}>
                Simpla Invest
              </span>
              <span style={{ color: "#93C5FD", fontFamily: "Poppins, sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: "0.04em" }}>
                Financial Planning
              </span>
            </div>
          </div>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}> › </span>
          <span style={{ color: "white", fontSize: 14 }}>Estratégia Inicial — Pronta</span>
          <span style={{ color: "#3B82F6", fontSize: 14, marginLeft: 4 }}>· {clientName}</span>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {ultimoSalvo && (
            <span style={{ fontSize: 12, color: "#3B82F6" }}>
              Salvo às{" "}
              {ultimoSalvo.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            onClick={imprimirConsultor}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid white",
              backgroundColor: "transparent",
              color: "white",
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Printer size={14} /> Imprimir PDF Consultor
          </button>
          <button
            onClick={imprimirCliente}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              backgroundColor: "#3B82F6",
              color: "#000000",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Download size={14} /> Imprimir PDF Cliente
          </button>
          {onSaveCloud && (
            <button
              onClick={handleSalvar}
              disabled={salvando}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.2)",
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: 13,
                cursor: salvando ? "not-allowed" : "pointer",
                opacity: salvando ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Save size={14} /> {salvando ? "Salvando…" : "Salvar"}
            </button>
          )}
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#F0F7FF" }}>
        <div
          style={{
            width: "100%",
            padding: 40,
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          {/* ── CAPA ─────────────────────────────────────────────────────── */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 48,
              textAlign: "center",
            }}
          >
            {estrategia.logoBase64 ? (
              <img
                src={estrategia.logoBase64}
                alt="Logo"
                style={{ height: 60, display: "block", margin: "0 auto 32px" }}
              />
            ) : (
              <img
                src="/logo-si.svg"
                alt="Simpla Invest"
                style={{ height: 80, width: 80, objectFit: "contain", margin: "0 auto 24px", display: "block", borderRadius: 8 }}
              />
            )}

            <div style={{ fontSize: 40, fontWeight: 700, color: "#000000", marginBottom: 8 }}>
              Estratégia Inicial
            </div>
            <div style={{ fontSize: 24, color: "#3B82F6", fontWeight: 700, marginBottom: 24 }}>
              {clientName}
            </div>

            <div
              style={{
                width: 80,
                borderTop: "2px solid #3B82F6",
                margin: "0 auto 24px",
              }}
            />

            {/* Info grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                maxWidth: 480,
                margin: "0 auto",
                textAlign: "left",
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  Perfil
                </div>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 13,
                    padding: "3px 10px",
                    borderRadius: 9999,
                    backgroundColor: "#DBEAFE",
                    color: "#000000",
                    fontWeight: 600,
                  }}
                >
                  {perfilLabel}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  Data
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#000000" }}>
                  {new Date().toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  Consultor
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#000000" }}>
                  {estrategia.nomeConsultor || "—"}
                </div>
              </div>
            </div>

            {estrategia.apresentacao && (
              <div
                style={{
                  fontStyle: "italic",
                  color: "#6B7280",
                  borderLeft: "3px solid #3B82F6",
                  paddingLeft: 16,
                  marginTop: 24,
                  textAlign: "left",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {estrategia.apresentacao}
              </div>
            )}
          </div>

          {/* ── COMENTÁRIO GERAL ──────────────────────────────────────────── */}
          {estrategia.comentarioGeral && (
            <div
              style={{
                backgroundColor: "#EFF6FF",
                borderLeft: "4px solid #3B82F6",
                borderRadius: 12,
                padding: 24,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  color: "#9CA3AF",
                  letterSpacing: "0.05em",
                  marginBottom: 8,
                }}
              >
                Mensagem do consultor
              </div>
              <div
                style={{
                  fontStyle: "italic",
                  color: "#111827",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {estrategia.comentarioGeral}
              </div>
            </div>
          )}

          {/* ── ASSET ALLOCATION ─────────────────────────────────────────── */}
          {areaCard(
            "#000000",
            <>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <PieChartIcon size={20} style={{ color: "#000000" }} />
                <span style={{ fontWeight: 700, fontSize: 18, color: "#000000" }}>
                  Asset Allocation
                </span>
                {statusBadgeLocal("assetAllocation", estrategia)}
              </div>

              {resultados.carteira ? (
                <>
                  {/* Metrics */}
                  <div
                    style={{
                      display: "flex",
                      gap: 24,
                      justifyContent: "space-around",
                      marginBottom: 16,
                      padding: "16px 0",
                      borderTop: "1px solid #F0F7FF",
                      borderBottom: "1px solid #F0F7FF",
                    }}
                  >
                    {metricaItem("Patrimônio", formatCurrency(resultados.carteira.patrimonio))}
                    {metricaItem("Total Aportes", formatCurrency(resultados.carteira.totalAportar), "#15803D")}
                    {metricaItem("Total Resgates", formatCurrency(resultados.carteira.totalResgatar), "#B91C1C")}
                  </div>
                  <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 12 }}>
                    Plano de ação: <strong>{resultados.carteira.planoAcaoCount}</strong> movimentações
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", marginBottom: 12 }}>
                  Ferramenta de carteira não utilizada nesta estratégia.
                </div>
              )}

              {estrategia.comentarios["assetAllocation"] && (
                <div
                  style={{
                    fontStyle: "italic",
                    color: "#6B7280",
                    fontSize: 13,
                    lineHeight: 1.6,
                    borderLeft: "2px solid #000000",
                    paddingLeft: 12,
                    marginTop: 8,
                  }}
                >
                  {estrategia.comentarios["assetAllocation"]}
                </div>
              )}
            </>
          )}

          {/* ── APOSENTADORIA / IF ───────────────────────────────────────── */}
          {areaCard(
            "#15803D",
            <>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <Flame size={20} style={{ color: "#15803D" }} />
                <span style={{ fontWeight: 700, fontSize: 18, color: "#000000" }}>
                  Aposentadoria / IF
                </span>
                {statusBadgeLocal("aposentadoria", estrategia)}
              </div>

              {resultados.if ? (
                <>
                  {/* 4 metrics */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 16,
                      padding: "16px 0",
                      borderTop: "1px solid #F0F7FF",
                      borderBottom: "1px solid #F0F7FF",
                      marginBottom: 16,
                    }}
                  >
                    {metricaItem("Pat. na IF", formatCurrency(resultados.if.patrimonioAposentadoria))}
                    {metricaItem("Renda Sustentável", formatCurrency(resultados.if.rendaSustentavel) + "/mês")}
                    {metricaItem(
                      "Gap de Renda",
                      formatCurrency(Math.abs(resultados.if.gapRenda)) + "/mês",
                      resultados.if.gapRenda <= 0 ? "#15803D" : "#B91C1C"
                    )}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                        Liberdade
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          padding: "3px 10px",
                          borderRadius: 9999,
                          backgroundColor: resultados.if.liberdadeAlcancada ? "#DCFCE7" : "#FEE2E2",
                          color: resultados.if.liberdadeAlcancada ? "#15803D" : "#B91C1C",
                          fontWeight: 600,
                          border: `1px solid ${resultados.if.liberdadeAlcancada ? "#86EFAC" : "#FCA5A5"}`,
                        }}
                      >
                        {resultados.if.liberdadeAlcancada ? "Alcançada" : "Em construção"}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {resultadoIF.patrimonioNecessario > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: "#6B7280",
                          marginBottom: 6,
                        }}
                      >
                        <span>Progresso patrimonial</span>
                        <span>
                          {Math.min(
                            100,
                            Math.round(
                              (resultados.if.patrimonioAposentadoria /
                                resultadoIF.patrimonioNecessario) *
                                100
                            )
                          )}
                          %
                        </span>
                      </div>
                      <div
                        style={{
                          height: 8,
                          backgroundColor: "#F0F7FF",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(
                              100,
                              (resultados.if.patrimonioAposentadoria /
                                resultadoIF.patrimonioNecessario) *
                                100
                            )}%`,
                            backgroundColor: "#15803D",
                            borderRadius: 4,
                            transition: "width 0.4s",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 3 info items */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 12,
                    }}
                  >
                    <div style={{ backgroundColor: "#F0F7FF", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>Renda desejada</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#000000" }}>
                        {formatCurrency(plan.planejamentoIF.rendaMensalDesejada)}/mês
                      </div>
                    </div>
                    <div style={{ backgroundColor: "#F0F7FF", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>Anos restantes</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#000000" }}>
                        {Math.max(0, plan.planejamentoIF.idadeMeta - plan.planejamentoIF.idadeAtual)} anos
                      </div>
                    </div>
                    <div style={{ backgroundColor: "#F0F7FF", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>Patrimônio necessário</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#000000" }}>
                        {formatCurrency(resultadoIF.patrimonioNecessario)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", marginBottom: 12 }}>
                  Simulador de IF não executado nesta estratégia.
                </div>
              )}

              {estrategia.comentarios["aposentadoria"] && (
                <div
                  style={{
                    fontStyle: "italic",
                    color: "#6B7280",
                    fontSize: 13,
                    lineHeight: 1.6,
                    borderLeft: "2px solid #15803D",
                    paddingLeft: 12,
                    marginTop: 16,
                  }}
                >
                  {estrategia.comentarios["aposentadoria"]}
                </div>
              )}
            </>
          )}

          {/* ── PROTEÇÃO E SUCESSÓRIO ─────────────────────────────────────── */}
          {areaCard(
            "#B91C1C",
            <>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <Shield size={20} style={{ color: "#B91C1C" }} />
                <span style={{ fontWeight: 700, fontSize: 18, color: "#000000" }}>
                  Proteção e Sucessório
                </span>
                {statusBadgeLocal("protecaoSucessorio", estrategia)}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {/* Left: Proteção */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#B91C1C",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 12,
                    }}
                  >
                    PROTEÇÃO
                  </div>

                  {resultados.seguro ? (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                        <span style={{ color: "#6B7280" }}>Capital necessário</span>
                        <span style={{ fontWeight: 600, color: "#000000" }}>{formatCurrency(resultados.seguro.totalNeed)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                        <span style={{ color: "#6B7280" }}>Capital atual</span>
                        <span style={{ fontWeight: 600, color: "#15803D" }}>{formatCurrency(resultados.seguro.totalCoverage)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 12 }}>
                        <span style={{ color: "#6B7280" }}>Gap cobertura</span>
                        <span style={{ fontWeight: 600, color: resultados.seguro.gap > 0 ? "#B91C1C" : "#15803D" }}>
                          {formatCurrency(resultados.seguro.gap)}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {checklist("Seguro de vida", plan.protecao.possuiSeguroVida)}
                  {checklist("Seguro de invalidez", plan.protecao.possuiSeguroInvalidez)}
                  {checklist("Plano de saúde", plan.protecao.possuiPlanoSaude)}
                </div>

                {/* Right: Sucessório */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#B91C1C",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 12,
                    }}
                  >
                    SUCESSÓRIO
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: "#6B7280" }}>ITCMD estimado</span>
                      <span style={{ fontWeight: 600, color: "#000000" }}>{formatCurrency(resultadoSuc.itcmdEstimado)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: "#6B7280" }}>Custo inventário</span>
                      <span style={{ fontWeight: 600, color: "#000000" }}>{formatCurrency(resultadoSuc.custoInventarioEstimado)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 12 }}>
                      <span style={{ color: "#6B7280" }}>Custo total</span>
                      <span style={{ fontWeight: 600, color: "#B91C1C" }}>{formatCurrency(resultadoSuc.custoTotal)}</span>
                    </div>
                  </div>

                  {checklist("Testamento", plan.sucessorio.possuiTestamento)}
                  {checklist("Holding familiar", plan.sucessorio.possuiHolding)}
                  {checklist("Seguro de vida sucessório", plan.sucessorio.possuiSeguroVidaSucessao)}
                </div>
              </div>

              {estrategia.comentarios["protecaoSucessorio"] && (
                <div
                  style={{
                    fontStyle: "italic",
                    color: "#6B7280",
                    fontSize: 13,
                    lineHeight: 1.6,
                    borderLeft: "2px solid #B91C1C",
                    paddingLeft: 12,
                    marginTop: 16,
                  }}
                >
                  {estrategia.comentarios["protecaoSucessorio"]}
                </div>
              )}
            </>
          )}

          {/* ── PLANEJAMENTO FISCAL ──────────────────────────────────────── */}
          {areaCard(
            "#2563EB",
            <>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <Receipt size={20} style={{ color: "#2563EB" }} />
                <span style={{ fontWeight: 700, fontSize: 18, color: "#000000" }}>
                  Planejamento Fiscal
                </span>
                {statusBadgeLocal("fiscal", estrategia)}
              </div>

              {resultados.fiscal ? (
                <>
                  {/* 3 metrics */}
                  <div
                    style={{
                      display: "flex",
                      gap: 24,
                      justifyContent: "space-around",
                      padding: "16px 0",
                      borderTop: "1px solid #F0F7FF",
                      borderBottom: "1px solid #F0F7FF",
                      marginBottom: 20,
                    }}
                  >
                    {metricaItem("Economia/ano", formatCurrency(resultados.fiscal.economiaAnual), "#15803D")}
                    {metricaItem("Teto PGBL", formatCurrency(resultados.fiscal.tetoPGBLAnual))}
                    {metricaItem("Espaço disponível", formatCurrency(resultados.fiscal.espacoDisponivelMensal) + "/mês", "#2563EB")}
                  </div>

                  {/* Horizontal bars */}
                  {(() => {
                    const maxIR = Math.max(resultados.fiscal.irSemPGBL, resultados.fiscal.irComPGBL, 1);
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {/* IR sem PGBL */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
                            <span>IR sem PGBL</span>
                            <span>{formatCurrency(resultados.fiscal.irSemPGBL)}</span>
                          </div>
                          <div style={{ height: 8, backgroundColor: "#F0F7FF", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(resultados.fiscal.irSemPGBL / maxIR) * 100}%`, backgroundColor: "#9CA3AF", borderRadius: 4 }} />
                          </div>
                        </div>
                        {/* IR com PGBL */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
                            <span>IR com PGBL</span>
                            <span>{formatCurrency(resultados.fiscal.irComPGBL)}</span>
                          </div>
                          <div style={{ height: 8, backgroundColor: "#F0F7FF", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(resultados.fiscal.irComPGBL / maxIR) * 100}%`, backgroundColor: "#15803D", borderRadius: 4 }} />
                          </div>
                        </div>
                        {/* Economia */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
                            <span>Economia</span>
                            <span style={{ color: "#15803D", fontWeight: 600 }}>{formatCurrency(resultados.fiscal.economiaAnual)}</span>
                          </div>
                          <div style={{ height: 8, backgroundColor: "#F0F7FF", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(resultados.fiscal.economiaAnual / maxIR) * 100}%`, backgroundColor: "#2563EB", borderRadius: 4 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", marginBottom: 12 }}>
                  Planejamento fiscal não executado nesta estratégia.
                </div>
              )}

              {estrategia.comentarios["fiscal"] && (
                <div
                  style={{
                    fontStyle: "italic",
                    color: "#6B7280",
                    fontSize: 13,
                    lineHeight: 1.6,
                    borderLeft: "2px solid #2563EB",
                    paddingLeft: 12,
                    marginTop: 16,
                  }}
                >
                  {estrategia.comentarios["fiscal"]}
                </div>
              )}
            </>
          )}

          {/* ── PRÓXIMOS PASSOS ──────────────────────────────────────────── */}
          {areaCard(
            "#1E40AF",
            <>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <ListChecks size={20} style={{ color: "#1E40AF" }} />
                <span style={{ fontWeight: 700, fontSize: 18, color: "#000000" }}>
                  Próximos Passos
                </span>
                {statusBadgeLocal("proximosPassos", estrategia)}
              </div>

              {/* Actions list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                {acoesOrdenadas.map((acao, index) => {
                  const prioBg =
                    acao.prioridade === "alta"
                      ? "#FEE2E2"
                      : acao.prioridade === "media"
                      ? "#EFF6FF"
                      : "#F0F9FF";
                  const prioColor =
                    acao.prioridade === "alta"
                      ? "#B91C1C"
                      : acao.prioridade === "media"
                      ? "#2563EB"
                      : "#1E40AF";
                  const prioLabel =
                    acao.prioridade === "alta"
                      ? "ALTA"
                      : acao.prioridade === "media"
                      ? "MÉDIA"
                      : "BAIXA";

                  return (
                    <div
                      key={acao.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "12px 14px",
                        backgroundColor: "#F0F7FF",
                        borderRadius: 8,
                      }}
                    >
                      {/* Number badge */}
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          backgroundColor: "#1E3A8A",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          {/* Priority badge */}
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 9999,
                              backgroundColor: prioBg,
                              color: prioColor,
                            }}
                          >
                            {prioLabel}
                          </span>
                          {/* Area badge */}
                          {acao.area && (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "2px 8px",
                                borderRadius: 9999,
                                backgroundColor: "#F0F7FF",
                                color: "#111827",
                              }}
                            >
                              {acao.area}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#000000" }}>{acao.texto}</div>
                        {acao.prazo && (
                          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                            até {acao.prazo}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {acoesOrdenadas.length === 0 && (
                  <div style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>
                    Nenhuma ação definida.
                  </div>
                )}
              </div>

            </>
          )}

          {/* ── DISCLAIMER ───────────────────────────────────────────────── */}
          <div
            style={{
              backgroundColor: "#F0F7FF",
              borderRadius: 8,
              padding: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.6 }}>
              Este documento foi elaborado pelo consultor{" "}
              {estrategia.nomeConsultor || "Simpla Invest Financial Planning"} com base nas informações
              fornecidas pelo cliente e tem caráter informativo. Não constitui oferta de compra ou
              venda de valores mobiliários. © Simpla Invest Financial Planning {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
