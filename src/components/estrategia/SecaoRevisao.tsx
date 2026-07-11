import React from "react";
import {
  PieChart as PieChartIcon,
  Flame,
  Shield,
  Receipt,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, calcularIdade } from "@/lib/format";
import {
  calcularIF,
  calcularSucessorio,
  calcularAlocacaoAtual,
  ALOCACAO_ALVO,
  PERFIL_LABELS,
} from "@/types/financialPlanning";
import { calcularPerfilHolding } from "@/lib/holding";
import { gerarAcoes } from "@/lib/estrategiaAcoes";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { SecaoId, EstrategiaData } from "./EstrategiaInicialPage";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";

const ESTADO_CIVIL_LABELS: Record<string, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
  uniao_estavel: "União estável",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  estrategia: EstrategiaData;
  resultados: ResultadosEstrategia;
  plan: FinancialPlan;
  clientName: string;
  onNavigate: (s: SecaoId) => void;
  onFinalizar: () => void;
  onComentarioGeralChange: (v: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASSE_COLORS: Record<string, string> = {
  rendaFixa: "#1E40AF",
  acoes: "#15803D",
  fiis: "#2563EB",
  rvGlobal: "#000000",
  rfGlobal: "#1E40AF",
  cripto: "#2563EB",
};

const CLASSE_LABELS: Record<string, string> = {
  rendaFixa: "Renda Fixa",
  acoes: "Ações",
  fiis: "FIIs",
  rvGlobal: "RV Global",
  rfGlobal: "RF Global",
  cripto: "Cripto",
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function safeCurrency(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return formatCurrency(v);
}

function statusBadge(secaoId: SecaoId, estrategia: EstrategiaData): React.ReactElement {
  const len = estrategia.comentarios[secaoId]?.length ?? 0;
  if (len > 20) {
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 999,
          backgroundColor: "#EFF6FF",
          color: "#2563EB",
          border: "1px solid #60A5FA",
        }}
      >
        Em revisão
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 999,
        backgroundColor: "#F0F7FF",
        color: "#6B7280",
        border: "1px solid #BFDBFE",
      }}
    >
      Pendente
    </span>
  );
}

function metrica(
  label: string,
  value: React.ReactNode,
  color?: string
): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: color ?? "#000000",
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── PieChart with error boundary ─────────────────────────────────────────────

interface PieSlice {
  name: string;
  value: number;
  color: string;
}

function SafePie({
  data,
  title,
}: {
  data: PieSlice[];
  title: string;
}): React.ReactElement {
  try {
    const filtered = data.filter((d) => d.value > 0);
    if (filtered.length === 0) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 140,
            color: "#9CA3AF",
            fontSize: 12,
          }}
        >
          Sem dados
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textAlign: "center" }}>
          {title}
        </span>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie
              data={filtered}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={56}
              innerRadius={28}
              paddingAngle={2}
            >
              {filtered.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: number) => [`${val.toFixed(1)}%`, ""]}
              contentStyle={{ fontSize: 11, borderRadius: 6 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
          {filtered.map((d) => (
            <div
              key={d.name}
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10 }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: d.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "#111827", flex: 1 }}>{d.name}</span>
              <span style={{ color: "#6B7280", fontWeight: 600 }}>
                {d.value.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  } catch {
    return (
      <div style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", padding: 16 }}>
        Erro ao renderizar gráfico
      </div>
    );
  }
}

function allocToSlices(alloc: Record<string, number>): PieSlice[] {
  return (Object.keys(CLASSE_LABELS) as (keyof typeof CLASSE_LABELS)[]).map((k) => ({
    name: CLASSE_LABELS[k],
    value: alloc[k] ?? 0,
    color: CLASSE_COLORS[k],
  }));
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────────

function AreaCard({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        border: "0.5px solid #E5E7EB",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px 12px",
        borderBottom: "1px solid #F0F7FF",
      }}
    >
      {children}
    </div>
  );
}

function CardBody({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div style={{ padding: "16px 20px" }}>{children}</div>;
}

function CommentArea({
  comentario,
  onNavigate,
  secaoId,
}: {
  comentario: string;
  onNavigate: (s: SecaoId) => void;
  secaoId: SecaoId;
}): React.ReactElement {
  return (
    <div
      style={{
        marginTop: 14,
        paddingTop: 14,
        borderTop: "1px solid #F0F7FF",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#9CA3AF",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: "0 0 4px",
          }}
        >
          Estratégia do consultor
        </p>
        {comentario ? (
          <p style={{ fontSize: 13, color: "#111827", fontStyle: "italic", margin: 0 }}>
            {comentario}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: "#BFDBFE", fontStyle: "italic", margin: 0 }}>
            Nenhum comentário adicionado
          </p>
        )}
      </div>
      <button
        onClick={() => onNavigate(secaoId)}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#3B82F6",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px 0",
          whiteSpace: "nowrap",
        }}
      >
        Editar →
      </button>
    </div>
  );
}

function Placeholder({ text }: { text: string }): React.ReactElement {
  return (
    <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>
      {text}
    </p>
  );
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({
  pct,
  color,
}: {
  pct: number;
  color: string;
}): React.ReactElement {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      style={{
        width: "100%",
        height: 8,
        borderRadius: 4,
        backgroundColor: "#F0F7FF",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: "100%",
          borderRadius: 4,
          backgroundColor: color,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────────

export function SecaoRevisao({
  estrategia,
  resultados,
  plan,
  clientName,
  onNavigate,
  onFinalizar,
  onComentarioGeralChange,
}: Props): React.ReactElement {
  // ── Holding ──
  const holdingPerfil = calcularPerfilHolding(
    { ...plan.dadosCliente, temEmpresa: plan.fiscal.temEmpresa },
    plan.sucessorio,
  );
  const holdingRecomendada = holdingPerfil.recomendada && !plan.sucessorio.possuiHolding;

  // ── Priority actions ──
  const todasAcoes = gerarAcoes(plan, resultados);
  const acoesPrioritarias = todasAcoes
    .filter((a) => a.prioridade === "alta" && !resultados.acoesConcluidas?.[a.id])
    .slice(0, 5);

  // ── Asset Allocation data ──
  const perfil = plan.dadosCliente.suitabilityPerfil;
  const alocAtualRaw = calcularAlocacaoAtual(plan.ativosAtuais);
  const alocAtualSlices = allocToSlices(alocAtualRaw as unknown as Record<string, number>);

  const alocMetaObj: Record<string, number> | null =
    plan.alocacaoPersonalizada
      ? (plan.alocacaoPersonalizada as unknown as Record<string, number>)
      : perfil
      ? (ALOCACAO_ALVO[perfil] as unknown as Record<string, number>)
      : null;
  const alocMetaSlices: PieSlice[] | null = alocMetaObj
    ? allocToSlices(alocMetaObj)
    : null;

  const classeKeys = Object.keys(CLASSE_LABELS) as (keyof typeof CLASSE_LABELS)[];

  // ── IF data ──
  const resultadoIFCalc = calcularIF(plan.planejamentoIF);
  const progressIF =
    resultadoIFCalc.patrimonioNecessario > 0 && resultados.if
      ? (resultados.if.patrimonioAposentadoria / resultadoIFCalc.patrimonioNecessario) * 100
      : 0;
  const progressIFColor =
    progressIF >= 80 ? "#15803D" : progressIF >= 50 ? "#2563EB" : "#B91C1C";

  const anosRestantes = Math.max(0, plan.planejamentoIF.idadeMeta - plan.planejamentoIF.idadeAtual);

  // ── Sucessório data ──
  const resultadoSuc = calcularSucessorio(plan.sucessorio);

  // ── Fiscal bars ──
  const maxFiscal = resultados.fiscal ? resultados.fiscal.irSemPGBL : 0;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* ── BLOCO 0: Dados do Cliente ── */}
      {(() => {
        const dc = plan.dadosCliente;
        const idade = dc.dataNascimento ? calcularIdade(dc.dataNascimento) : plan.planejamentoIF.idadeAtual;
        const nFilhos = (dc.filhos ?? []).length;
        return (
          <div style={{ backgroundColor: "white", borderRadius: 12, border: "0.5px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "16px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
              Dados do Cliente
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 24px" }}>
              {[
                { label: "Idade", value: idade ? `${idade} anos` : "—" },
                { label: "Perfil", value: perfil ? PERFIL_LABELS[perfil] : "Não definido" },
                { label: "Estado civil", value: ESTADO_CIVIL_LABELS[dc.estadoCivil ?? ""] ?? "—" },
                { label: "Filhos", value: nFilhos > 0 ? `${nFilhos} filho${nFilhos > 1 ? "s" : ""}` : "Sem filhos" },
                { label: "Cidade / UF", value: [dc.cidade, dc.estado].filter(Boolean).join(" / ") || "—" },
                { label: "Patrimônio total", value: formatCurrency(dc.patrimonioTotalEstimado ?? 0) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", margin: "0 0 2px" }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── BLOCO 1: Cards por área ── */}

      {/* Card 1: Asset Allocation */}
      <AreaCard>
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PieChartIcon style={{ width: 20, height: 20, color: "#000000" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#000000" }}>
              Asset Allocation
            </span>
            {statusBadge("assetAllocation", estrategia)}
          </div>
          {perfil && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 999,
                backgroundColor: "#DBEAFE",
                color: "#000000",
                border: "1px solid #BFDBFE",
              }}
            >
              {PERFIL_LABELS[perfil]}
            </span>
          )}
        </CardHeader>
        <CardBody>
          {resultados.carteira ? (
            <>
              {/* 3 métricas inline */}
              <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
                {metrica("Patrimônio", safeCurrency(resultados.carteira.patrimonio))}
                {metrica(
                  "Total Aportes",
                  safeCurrency(resultados.carteira.totalAportes ?? 0),
                  "#15803D"
                )}
                {metrica(
                  "Total Resgates",
                  safeCurrency(resultados.carteira.totalResgates ?? 0),
                  "#B91C1C"
                )}
              </div>

              {/* PieCharts */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: alocMetaSlices ? "1fr 1fr" : "1fr",
                  gap: 24,
                  marginBottom: 20,
                }}
              >
                <SafePie data={alocAtualSlices} title="Atual" />
                {alocMetaSlices && <SafePie data={alocMetaSlices} title="Meta" />}
              </div>

              {/* Tabela de alocação */}
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "4px 8px",
                          color: "#9CA3AF",
                          fontWeight: 600,
                          borderBottom: "1px solid #F0F7FF",
                        }}
                      >
                        Classe
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "4px 8px",
                          color: "#9CA3AF",
                          fontWeight: 600,
                          borderBottom: "1px solid #F0F7FF",
                        }}
                      >
                        % Atual
                      </th>
                      {alocMetaObj && (
                        <th
                          style={{
                            textAlign: "right",
                            padding: "4px 8px",
                            color: "#9CA3AF",
                            fontWeight: 600,
                            borderBottom: "1px solid #F0F7FF",
                          }}
                        >
                          % Meta
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {classeKeys.slice(0, 6).map((k) => {
                      const atualVal = (alocAtualRaw as unknown as Record<string, number>)[k] ?? 0;
                      const metaVal = alocMetaObj ? alocMetaObj[k] ?? 0 : null;
                      return (
                        <tr key={k}>
                          <td
                            style={{
                              padding: "4px 8px",
                              color: "#111827",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                backgroundColor: CLASSE_COLORS[k],
                                flexShrink: 0,
                                display: "inline-block",
                              }}
                            />
                            {CLASSE_LABELS[k]}
                          </td>
                          <td
                            style={{
                              padding: "4px 8px",
                              textAlign: "right",
                              color: "#111827",
                              fontWeight: 600,
                            }}
                          >
                            {atualVal.toFixed(1)}%
                          </td>
                          {alocMetaObj && (
                            <td
                              style={{
                                padding: "4px 8px",
                                textAlign: "right",
                                color: "#6B7280",
                              }}
                            >
                              {metaVal !== null ? `${metaVal.toFixed(1)}%` : "—"}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <Placeholder text="Carteira não mapeada — utilize a ferramenta de Asset Allocation" />
          )}

          <CommentArea
            comentario={estrategia.comentarios["assetAllocation"] ?? ""}
            onNavigate={onNavigate}
            secaoId="assetAllocation"
          />
        </CardBody>
      </AreaCard>

      {/* Card 2: Aposentadoria / IF */}
      <AreaCard>
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Flame style={{ width: 20, height: 20, color: "#15803D" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#000000" }}>
              Aposentadoria
            </span>
            {statusBadge("aposentadoria", estrategia)}
          </div>
        </CardHeader>
        <CardBody>
          {resultados.if ? (
            <>
              {/* 4 métricas */}
              <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
                {metrica(
                  "Pat. na Aposentadoria",
                  safeCurrency(resultados.if.patrimonioAposentadoria)
                )}
                {metrica(
                  "Renda Sustentável",
                  `${safeCurrency(resultados.if.rendaSustentavel)}/mês`
                )}
                {metrica(
                  "Gap de Renda",
                  safeCurrency(resultados.if.gapRenda),
                  resultados.if.gapRenda > 0 ? "#B91C1C" : "#15803D"
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
                    Liberdade Financeira
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 999,
                      backgroundColor: resultados.if.liberdadeAlcancada ? "#DCFCE7" : "#FEE2E2",
                      color: resultados.if.liberdadeAlcancada ? "#15803D" : "#B91C1C",
                      border: `1px solid ${resultados.if.liberdadeAlcancada ? "#86EFAC" : "#FCA5A5"}`,
                      display: "inline-block",
                    }}
                  >
                    {resultados.if.liberdadeAlcancada ? "✓ Alcançada" : "✗ Não alcançada"}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 16 }}>
                <ProgressBar pct={progressIF} color={progressIFColor} />
                <p style={{ fontSize: 11, color: "#6B7280", margin: "4px 0 0" }}>
                  Progresso: {progressIF.toFixed(0)}% do patrimônio necessário (
                  {safeCurrency(resultadoIFCalc.patrimonioNecessario)})
                </p>
              </div>

              {/* 3 métricas adicionais */}
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {metrica(
                  "Renda desejada",
                  `${safeCurrency(plan.planejamentoIF.rendaMensalDesejada)}/mês`
                )}
                {metrica(
                  "Anos restantes",
                  `${anosRestantes} anos`
                )}
                {metrica(
                  "Taxa a.a.",
                  `${plan.planejamentoIF.taxaRetornoAnual.toFixed(1)}%`
                )}
              </div>
            </>
          ) : (
            <Placeholder text="Simulador de Aposentadoria não executado — utilize a ferramenta de Aposentadoria" />
          )}

          <CommentArea
            comentario={estrategia.comentarios["aposentadoria"] ?? ""}
            onNavigate={onNavigate}
            secaoId="aposentadoria"
          />
        </CardBody>
      </AreaCard>

      {/* Card 3: Proteção e Sucessório */}
      <AreaCard>
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Shield style={{ width: 20, height: 20, color: "#B91C1C" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#000000" }}>
              Proteção e Sucessório
            </span>
            {statusBadge("protecaoSucessorio", estrategia)}
            {holdingRecomendada && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: "#F3E8FF", color: "#7C3AED", border: "1px solid #DDD6FE" }}>
                Holding recomendada
              </span>
            )}
          </div>
        </CardHeader>
        <CardBody>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Left: Proteção */}
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  margin: "0 0 10px",
                }}
              >
                Proteção
              </p>

              {resultados.seguro ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                    {metrica("Capital necessário", safeCurrency(resultados.seguro.totalNeed))}
                    {metrica("Capital atual", safeCurrency(resultados.seguro.totalCoverage))}
                    {metrica(
                      "Gap cobertura",
                      safeCurrency(resultados.seguro.gap),
                      resultados.seguro.gap > 0 ? "#B91C1C" : "#15803D"
                    )}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <ProgressBar
                      pct={
                        resultados.seguro.totalNeed > 0
                          ? (resultados.seguro.totalCoverage / resultados.seguro.totalNeed) * 100
                          : 0
                      }
                      color="#B91C1C"
                    />
                  </div>
                </>
              ) : null}

              {/* Checklist proteção */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { ok: plan.protecao.possuiSeguroVida, label: "Seguro de vida" },
                  { ok: plan.protecao.possuiSeguroInvalidez, label: "Seguro de invalidez" },
                  { ok: plan.protecao.possuiPlanoSaude, label: "Plano de saúde" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}
                  >
                    <span style={{ color: item.ok ? "#15803D" : "#B91C1C", fontWeight: 700 }}>
                      {item.ok ? "✓" : "✗"}
                    </span>
                    <span style={{ color: "#111827" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Sucessório */}
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  margin: "0 0 10px",
                }}
              >
                Sucessório
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {metrica("ITCMD estimado", safeCurrency(resultadoSuc.itcmdEstimado))}
                {metrica(
                  "Custo inventário",
                  safeCurrency(resultadoSuc.custoInventarioEstimado)
                )}
                {metrica(
                  "Custo total",
                  safeCurrency(resultadoSuc.custoTotal),
                  "#2563EB"
                )}
              </div>

              {/* Checklist sucessório */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { ok: plan.sucessorio.possuiTestamento, label: "Testamento" },
                  { ok: plan.sucessorio.possuiHolding, label: "Holding familiar" },
                  {
                    ok: plan.sucessorio.possuiSeguroVidaSucessao,
                    label: "Seguro vida sucessão",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}
                  >
                    <span style={{ color: item.ok ? "#15803D" : "#B91C1C", fontWeight: 700 }}>
                      {item.ok ? "✓" : "✗"}
                    </span>
                    <span style={{ color: "#111827" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <CommentArea
            comentario={estrategia.comentarios["protecaoSucessorio"] ?? ""}
            onNavigate={onNavigate}
            secaoId="protecaoSucessorio"
          />
        </CardBody>
      </AreaCard>

      {/* Card 4: Planejamento Fiscal */}
      <AreaCard>
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Receipt style={{ width: 20, height: 20, color: "#2563EB" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#000000" }}>
              Planejamento Tributário
            </span>
            {statusBadge("fiscal", estrategia)}
          </div>
        </CardHeader>
        <CardBody>
          {resultados.fiscal ? (
            <>
              {/* 3 métricas */}
              <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
                {metrica(
                  "Economia/ano",
                  safeCurrency(resultados.fiscal.economiaAnual),
                  "#15803D"
                )}
                {metrica("Teto PGBL", safeCurrency(resultados.fiscal.tetoPGBLAnual))}
                {metrica(
                  "Espaço disponível",
                  `${safeCurrency(resultados.fiscal.espacoDisponivelMensal)}/mês`,
                  "#2563EB"
                )}
              </div>

              {/* Barras comparativas */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {[
                  {
                    label: "IR sem PGBL",
                    value: resultados.fiscal.irSemPGBL,
                    color: "#9CA3AF",
                  },
                  {
                    label: "IR com PGBL",
                    value: resultados.fiscal.irComPGBL,
                    color: "#15803D",
                  },
                  {
                    label: "Economia",
                    value: resultados.fiscal.economiaAnual,
                    color: "#2563EB",
                  },
                ].map((bar) => (
                  <div
                    key={bar.label}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        width: 80,
                        flexShrink: 0,
                        textAlign: "right",
                      }}
                    >
                      {bar.label}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#F0F7FF",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width:
                            maxFiscal > 0
                              ? `${Math.min(100, (bar.value / maxFiscal) * 100)}%`
                              : "0%",
                          height: "100%",
                          borderRadius: 4,
                          backgroundColor: bar.color,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#111827",
                        width: 100,
                        flexShrink: 0,
                      }}
                    >
                      {safeCurrency(bar.value)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Badge recomendação PGBL */}
              {resultados.fiscal.irSemPGBL > resultados.fiscal.irComPGBL && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 12px",
                    borderRadius: 999,
                    backgroundColor: "#EFF6FF",
                    border: "1px solid #2563EB",
                    color: "#2563EB",
                  }}
                >
                  ✓ Recomendação: PGBL
                </span>
              )}
            </>
          ) : (
            <Placeholder text="Calculadora de Diferimento Fiscal não utilizada — execute o planejamento tributário" />
          )}

          <CommentArea
            comentario={estrategia.comentarios["fiscal"] ?? ""}
            onNavigate={onNavigate}
            secaoId="fiscal"
          />
        </CardBody>
      </AreaCard>

      {/* ── BLOCO 2.5: Ações Prioritárias ── */}
      {acoesPrioritarias.length > 0 && (
        <div style={{ backgroundColor: "white", borderRadius: 12, border: "0.5px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "16px 20px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
            Ações Prioritárias
          </p>
          <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {acoesPrioritarias.map((acao) => (
              <li key={acao.id} style={{ fontSize: 13, color: "#111827", lineHeight: 1.5 }}>
                <span style={{ fontWeight: 500 }}>{acao.texto}</span>
                <span style={{ fontSize: 11, color: acao.areaColor, marginLeft: 6, fontWeight: 600 }}>
                  · {acao.area}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── BLOCO 3: Comentário Geral ── */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          border: "0.5px solid #E5E7EB",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
          <MessageSquare style={{ width: 20, height: 20, color: "#3B82F6", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#000000", margin: "0 0 2px" }}>
              Comentário Geral do Consultor
            </p>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
              Observações gerais sobre a estratégia para {clientName || "o cliente"}
            </p>
          </div>
        </div>
        <textarea
          value={estrategia.comentarioGeral}
          onChange={(e) => onComentarioGeralChange(e.target.value)}
          placeholder="Adicione aqui um comentário geral sobre a estratégia, pontos de atenção, contexto do cliente ou próximos passos..."
          style={{
            width: "100%",
            minHeight: 120,
            padding: "12px 14px",
            border: "1px solid #BFDBFE",
            borderRadius: 8,
            fontSize: 14,
            color: "#111827",
            resize: "vertical",
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* ── BLOCO 4: Botão Finalizar ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          marginTop: 8,
          marginBottom: 16,
        }}
      >
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0, textAlign: "center" }}>
          Estratégia revisada e pronta?
        </p>
        <button
          onClick={onFinalizar}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: "#1E3A8A",
            color: "white",
            border: "none",
            padding: "16px 48px",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.88";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          Finalizar e ver Estratégia Inicial
          <ArrowRight style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {/* ── BLOCO 5: Rodapé ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", backgroundColor: "white", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>
          Estratégia elaborada por <strong style={{ color: "#1E3A8A" }}>Simpla Invest</strong>
        </span>
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>
          {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}
