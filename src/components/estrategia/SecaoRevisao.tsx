import React from "react";
import {
  CheckCircle,
  AlertCircle,
  PieChart as PieChartIcon,
  Flame,
  Shield,
  Receipt,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/format";
import {
  calcularIF,
  calcularSucessorio,
  calcularAlocacaoAtual,
  ALOCACAO_ALVO,
  PERFIL_LABELS,
} from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { SecaoId, EstrategiaData } from "./EstrategiaInicialPage";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";

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

const SECOES_CONTENT: { id: SecaoId; label: string; color: string }[] = [
  { id: "assetAllocation", label: "Asset Allocation", color: "#000000" },
  { id: "aposentadoria", label: "Aposentadoria / IF", color: "#3D6B41" },
  { id: "protecaoSucessorio", label: "Proteção e Sucessório", color: "#7A3535" },
  { id: "fiscal", label: "Planejamento Fiscal", color: "#8A7A45" },
  { id: "proximosPassos", label: "Próximos Passos", color: "#2A4F6A" },
];

const CLASSE_COLORS: Record<string, string> = {
  rendaFixa: "#2A4F6A",
  acoes: "#3D6B41",
  fiis: "#8A7A45",
  rvGlobal: "#000000",
  rfGlobal: "#2A4F6A",
  cripto: "#8A7A45",
};

const CLASSE_LABELS: Record<string, string> = {
  rendaFixa: "Renda Fixa",
  acoes: "Ações",
  fiis: "FIIs",
  rvGlobal: "RV Global",
  rfGlobal: "RF Global",
  cripto: "Cripto",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
          backgroundColor: "#F5F0E0",
          color: "#8A7A45",
          border: "1px solid #D4C08A",
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
        backgroundColor: "#F5F3EE",
        color: "#6B6347",
        border: "1px solid #E2DCC8",
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
      <span style={{ fontSize: 11, color: "#9E9070", fontWeight: 500 }}>{label}</span>
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
            color: "#9E9070",
            fontSize: 12,
          }}
        >
          Sem dados
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#6B6347", textAlign: "center" }}>
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
              <span style={{ color: "#3D3520", flex: 1 }}>{d.name}</span>
              <span style={{ color: "#6B6347", fontWeight: 600 }}>
                {d.value.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  } catch {
    return (
      <div style={{ fontSize: 12, color: "#9E9070", textAlign: "center", padding: 16 }}>
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

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function AreaCard({
  borderColor,
  children,
}: {
  borderColor: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        borderLeft: `4px solid ${borderColor}`,
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
        borderBottom: "1px solid #F5F3EE",
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
        borderTop: "1px solid #F5F3EE",
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
            color: "#9E9070",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: "0 0 4px",
          }}
        >
          Estratégia do consultor
        </p>
        {comentario ? (
          <p style={{ fontSize: 13, color: "#3D3520", fontStyle: "italic", margin: 0 }}>
            {comentario}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: "#E2DCC8", fontStyle: "italic", margin: 0 }}>
            Nenhum comentário adicionado
          </p>
        )}
      </div>
      <button
        onClick={() => onNavigate(secaoId)}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#BBA866",
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
    <p style={{ fontSize: 13, color: "#9E9070", fontStyle: "italic", margin: 0 }}>
      {text}
    </p>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

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
        backgroundColor: "#F5F3EE",
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function SecaoRevisao({
  estrategia,
  resultados,
  plan,
  clientName,
  onNavigate,
  onFinalizar,
  onComentarioGeralChange,
}: Props): React.ReactElement {
  const pendentes = SECOES_CONTENT.filter(
    (s) => (estrategia.comentarios[s.id]?.length ?? 0) <= 20
  ).length;
  const todasConcluidas = pendentes === 0;

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
    progressIF >= 80 ? "#3D6B41" : progressIF >= 50 ? "#8A7A45" : "#7A3535";

  const anosRestantes = Math.max(0, plan.planejamentoIF.idadeMeta - plan.planejamentoIF.idadeAtual);

  // ── Sucessório data ──
  const resultadoSuc = calcularSucessorio(plan.sucessorio);

  // ── Fiscal bars ──
  const maxFiscal = resultados.fiscal ? resultados.fiscal.irSemPGBL : 0;

  return (
    <div
      style={{
        maxWidth: 900,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* ── BLOCO 1: Banner de status ── */}
      <div
        style={{
          padding: "16px 20px",
          borderRadius: 10,
          backgroundColor: todasConcluidas ? "#EBF2EC" : "#F5F0E0",
          border: `1px solid ${todasConcluidas ? "#A8C8AB" : "#D4C08A"}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {todasConcluidas ? (
          <CheckCircle style={{ width: 18, height: 18, color: "#3D6B41", flexShrink: 0 }} />
        ) : (
          <AlertCircle style={{ width: 18, height: 18, color: "#8A7A45", flexShrink: 0 }} />
        )}
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: todasConcluidas ? "#3D6B41" : "#8A7A45",
          }}
        >
          {todasConcluidas
            ? "Estratégia completa — todas as seções revisadas"
            : `${pendentes} seção${pendentes > 1 ? "ões" : ""} pendente${pendentes > 1 ? "s" : ""} — revise antes de finalizar`}
        </span>
        {!todasConcluidas && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SECOES_CONTENT.filter(
              (s) => (estrategia.comentarios[s.id]?.length ?? 0) <= 20
            ).map((s) => (
              <span
                key={s.id}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  backgroundColor: "white",
                  border: `1px solid ${s.color}`,
                  color: s.color,
                }}
              >
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── BLOCO 2: Cards por área ── */}

      {/* Card 1: Asset Allocation */}
      <AreaCard borderColor="#000000">
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
                backgroundColor: "#EDE9DC",
                color: "#000000",
                border: "1px solid #E2DCC8",
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
                  safeCurrency(resultados.carteira.totalAportar),
                  "#3D6B41"
                )}
                {metrica(
                  "Total Resgates",
                  safeCurrency(resultados.carteira.totalResgatar),
                  "#7A3535"
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
                          color: "#9E9070",
                          fontWeight: 600,
                          borderBottom: "1px solid #F5F3EE",
                        }}
                      >
                        Classe
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "4px 8px",
                          color: "#9E9070",
                          fontWeight: 600,
                          borderBottom: "1px solid #F5F3EE",
                        }}
                      >
                        % Atual
                      </th>
                      {alocMetaObj && (
                        <th
                          style={{
                            textAlign: "right",
                            padding: "4px 8px",
                            color: "#9E9070",
                            fontWeight: 600,
                            borderBottom: "1px solid #F5F3EE",
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
                              color: "#3D3520",
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
                              color: "#3D3520",
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
                                color: "#6B6347",
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
      <AreaCard borderColor="#3D6B41">
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Flame style={{ width: 20, height: 20, color: "#3D6B41" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#000000" }}>
              Aposentadoria / IF
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
                  "Pat. na IF",
                  safeCurrency(resultados.if.patrimonioAposentadoria)
                )}
                {metrica(
                  "Renda Sustentável",
                  `${safeCurrency(resultados.if.rendaSustentavel)}/mês`
                )}
                {metrica(
                  "Gap de Renda",
                  safeCurrency(resultados.if.gapRenda),
                  resultados.if.gapRenda > 0 ? "#7A3535" : "#3D6B41"
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 11, color: "#9E9070", fontWeight: 500 }}>
                    Liberdade Financeira
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 999,
                      backgroundColor: resultados.if.liberdadeAlcancada ? "#EBF2EC" : "#F2EBEB",
                      color: resultados.if.liberdadeAlcancada ? "#3D6B41" : "#7A3535",
                      border: `1px solid ${resultados.if.liberdadeAlcancada ? "#A8C8AB" : "#C8A8A8"}`,
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
                <p style={{ fontSize: 11, color: "#6B6347", margin: "4px 0 0" }}>
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
            <Placeholder text="Simulador de IF não executado — utilize a ferramenta de Aposentadoria" />
          )}

          <CommentArea
            comentario={estrategia.comentarios["aposentadoria"] ?? ""}
            onNavigate={onNavigate}
            secaoId="aposentadoria"
          />
        </CardBody>
      </AreaCard>

      {/* Card 3: Proteção e Sucessório */}
      <AreaCard borderColor="#7A3535">
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Shield style={{ width: 20, height: 20, color: "#7A3535" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#000000" }}>
              Proteção e Sucessório
            </span>
            {statusBadge("protecaoSucessorio", estrategia)}
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
                  color: "#9E9070",
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
                      resultados.seguro.gap > 0 ? "#7A3535" : "#3D6B41"
                    )}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <ProgressBar
                      pct={
                        resultados.seguro.totalNeed > 0
                          ? (resultados.seguro.totalCoverage / resultados.seguro.totalNeed) * 100
                          : 0
                      }
                      color="#7A3535"
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
                    <span style={{ color: item.ok ? "#3D6B41" : "#7A3535", fontWeight: 700 }}>
                      {item.ok ? "✓" : "✗"}
                    </span>
                    <span style={{ color: "#3D3520" }}>{item.label}</span>
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
                  color: "#9E9070",
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
                  "#8A7A45"
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
                    <span style={{ color: item.ok ? "#3D6B41" : "#7A3535", fontWeight: 700 }}>
                      {item.ok ? "✓" : "✗"}
                    </span>
                    <span style={{ color: "#3D3520" }}>{item.label}</span>
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
      <AreaCard borderColor="#8A7A45">
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Receipt style={{ width: 20, height: 20, color: "#8A7A45" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#000000" }}>
              Planejamento Fiscal
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
                  "#3D6B41"
                )}
                {metrica("Teto PGBL", safeCurrency(resultados.fiscal.tetoPGBLAnual))}
                {metrica(
                  "Espaço disponível",
                  `${safeCurrency(resultados.fiscal.espacoDisponivelMensal)}/mês`,
                  "#8A7A45"
                )}
              </div>

              {/* Barras comparativas */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {[
                  {
                    label: "IR sem PGBL",
                    value: resultados.fiscal.irSemPGBL,
                    color: "#9E9070",
                  },
                  {
                    label: "IR com PGBL",
                    value: resultados.fiscal.irComPGBL,
                    color: "#3D6B41",
                  },
                  {
                    label: "Economia",
                    value: resultados.fiscal.economiaAnual,
                    color: "#8A7A45",
                  },
                ].map((bar) => (
                  <div
                    key={bar.label}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "#6B6347",
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
                        backgroundColor: "#F5F3EE",
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
                        color: "#3D3520",
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
                    backgroundColor: "#F5F0E0",
                    border: "1px solid #8A7A45",
                    color: "#8A7A45",
                  }}
                >
                  ✓ Recomendação: PGBL
                </span>
              )}
            </>
          ) : (
            <Placeholder text="Calculadora PGBL não utilizada — execute o planejamento fiscal" />
          )}

          <CommentArea
            comentario={estrategia.comentarios["fiscal"] ?? ""}
            onNavigate={onNavigate}
            secaoId="fiscal"
          />
        </CardBody>
      </AreaCard>

      {/* ── BLOCO 3: Comentário Geral ── */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          borderLeft: "4px solid #BBA866",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
          <MessageSquare style={{ width: 20, height: 20, color: "#BBA866", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#000000", margin: "0 0 2px" }}>
              Comentário Geral do Consultor
            </p>
            <p style={{ fontSize: 13, color: "#9E9070", margin: 0 }}>
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
            border: "1px solid #E2DCC8",
            borderRadius: 8,
            fontSize: 14,
            color: "#3D3520",
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
        <p style={{ fontSize: 14, color: "#6B6347", margin: 0, textAlign: "center" }}>
          Estratégia revisada e pronta?
        </p>
        <button
          onClick={onFinalizar}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: "#000000",
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
        {pendentes > 0 && (
          <p
            style={{
              fontSize: 13,
              color: "#8A7A45",
              margin: 0,
              textAlign: "center",
            }}
          >
            ⚠ {pendentes} seção{pendentes > 1 ? "ões" : ""} pendente{pendentes > 1 ? "s" : ""} não{" "}
            {pendentes > 1 ? "serão incluídas" : "será incluída"}
          </p>
        )}
      </div>
    </div>
  );
}
