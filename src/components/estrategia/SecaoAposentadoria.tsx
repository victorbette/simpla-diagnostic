import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { Pencil } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { calcularIF } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaModal } from "@/components/ferramentas/FerramentaModal";
import { FerramentaLiberdadeFinanceira } from "@/components/ferramentas/FerramentaLiberdadeFinanceira";
import type { ResultadoIF } from "@/types/estrategiaResultados";

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoIF: ResultadoIF | null;
  onResultadoIF: (r: ResultadoIF) => void;
}

const AVAILABLE_TAGS = ["IF", "Aposentadoria", "Aportes", "Previdência", "PGBL"];

const CARD: React.CSSProperties = {
  backgroundColor: "white", borderRadius: 12, padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

function gerarProjecao(
  idadeAtual: number, idadeMeta: number, patrimonioAtual: number,
  aporteMensal: number, taxaAnual: number, patrimonioNecessario: number,
) {
  const anos = Math.max(1, idadeMeta - idadeAtual);
  const taxaMensal = taxaAnual / 100 / 12;
  const data: { idade: string; projecao: number; meta: number }[] = [];
  let p = patrimonioAtual;
  for (let i = 0; i <= anos; i++) {
    data.push({ idade: String(idadeAtual + i), projecao: Math.round(p), meta: Math.round(patrimonioNecessario) });
    for (let m = 0; m < 12; m++) p = p * (1 + taxaMensal) + aporteMensal;
  }
  return data;
}

function formatAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export function SecaoAposentadoria({ plan, comentario, onComentarioChange, tags, onTagsChange, resultadoIF, onResultadoIF }: Props) {
  const [lastEdit, setLastEdit] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const r = calcularIF(plan.planejamentoIF);
  const p = plan.planejamentoIF;
  const anosRestantes = Math.max(0, p.idadeMeta - p.idadeAtual);

  const aporteNecessario = (() => {
    if (r.gap <= 0) return 0;
    const taxaMensal = p.taxaRetornoAnual / 100 / 12;
    const meses = anosRestantes * 12;
    if (meses === 0) return r.gap;
    if (taxaMensal === 0) return r.gap / meses;
    return (r.gap * taxaMensal) / (Math.pow(1 + taxaMensal, meses) - 1);
  })();

  const projecaoData = gerarProjecao(p.idadeAtual, p.idadeMeta, p.patrimonioAtual, p.aporteMensal, p.taxaRetornoAnual, r.patrimonioNecessario);

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  function handleComentario(v: string) {
    onComentarioChange(v);
    setLastEdit(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>
        {/* Coluna esquerda */}
        <div>
          {/* Diagnóstico card */}
          <div style={{ ...CARD, borderTop: "3px solid #22C55E" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Diagnóstico IF
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {[
                { label: "Idade atual", value: `${p.idadeAtual} anos` },
                { label: "Idade meta IF", value: `${p.idadeMeta} anos` },
                { label: "Renda desejada na IF", value: `${formatCurrency(p.rendaMensalDesejada)}/mês`, color: "#0D9488" },
                { label: "Renda atingível", value: `${formatCurrency(r.rendaMensalAtingivel)}/mês`, color: r.rendaMensalAtingivel >= p.rendaMensalDesejada ? "#16A34A" : "#DC2626" },
                { label: "Patrimônio necessário", value: formatCurrency(r.patrimonioNecessario), color: "#041A20" },
                { label: "Projeção c/ aportes", value: formatCurrency(r.patrimonioProjetado), color: "#16A34A" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>{label}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: color ?? "#041A20", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#374151", marginBottom: 6 }}>
                <span>{formatNumber(r.percentualIF, 0)}% do caminho percorrido</span>
                <span style={{ color: "#16A34A", fontWeight: 600 }}>{formatNumber(r.percentualIF, 0)}%</span>
              </div>
              <div style={{ height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, r.percentualIF)}%`, backgroundColor: "#22C55E", borderRadius: 4, transition: "width 0.4s" }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6B7280" }}>Gap patrimonial</span>
                <span style={{ fontWeight: 600, color: r.gap > 0 ? "#DC2626" : "#16A34A" }}>
                  {r.gap > 0 ? "-" : "+"}{formatCurrency(Math.abs(r.gap))}
                </span>
              </div>
              {aporteNecessario > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#6B7280" }}>Aporte necessário</span>
                  <span style={{ fontWeight: 600, color: "#B45309" }}>{formatCurrency(aporteNecessario)}/mês</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6B7280" }}>Renda sustentável</span>
                <span style={{ fontWeight: 600, color: "#041A20" }}>{formatCurrency(r.rendaMensalAtingivel)}/mês</span>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              style={{ marginTop: 16, width: "100%", padding: "9px 0", border: "1px solid #22C55E", borderRadius: 6, backgroundColor: "transparent", color: "#22C55E", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
            >
              Simulador completo de IF →
            </button>
          </div>

          {/* Estratégia card */}
          <div style={{ ...CARD, borderTop: "3px solid #041A20", marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Pencil style={{ width: 14, height: 14, color: "#6B7280" }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: 0 }}>Estratégia e Recomendações</p>
            </div>
            <div style={{ position: "relative" }}>
              <textarea
                value={comentario}
                onChange={(e) => handleComentario(e.target.value)}
                placeholder="Ex: Para atingir a IF aos 60 anos, o cliente precisa aumentar o aporte mensal de R$ 3.000 para R$ 4.500..."
                style={{ width: "100%", minHeight: 200, padding: "10px 12px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 13, color: "#041A20", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
              <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#9CA3AF" }}>{comentario.length} caracteres</span>
            </div>
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6B7280", marginRight: 4 }}>Tags:</span>
              {AVAILABLE_TAGS.map((t) => (
                <button key={t} onClick={() => toggleTag(t)} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, cursor: "pointer", border: "1px solid #E5E7EB", backgroundColor: tags.includes(t) ? "#041A20" : "transparent", color: tags.includes(t) ? "white" : "#374151" }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>{lastEdit ? `Última edição: ${lastEdit}` : "Não editado"}</span>
              <button style={{ fontSize: 12, padding: "5px 14px", borderRadius: 6, backgroundColor: "#041A20", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}>Salvar</button>
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div>
          <div style={{ ...CARD, borderTop: "3px solid #22C55E" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Projeção Patrimonial</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={projecaoData}>
                <defs>
                  <linearGradient id="gradIF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="idade" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={formatAxis} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => formatCurrency(v as number)} labelFormatter={(l) => `Idade ${l}`} />
                <ReferenceLine y={r.patrimonioNecessario} stroke="#EF4444" strokeDasharray="4 4" label={{ value: "Meta", position: "right", fontSize: 10, fill: "#EF4444" }} />
                <Area type="monotone" dataKey="projecao" name="Projeção" stroke="#3B82F6" fill="url(#gradIF)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              {[
                { label: "Anos restantes", value: `${anosRestantes} anos` },
                { label: "Renda desejada", value: `${formatCurrency(p.rendaMensalDesejada)}/mês` },
                { label: "Renda atingível", value: `${formatCurrency(r.rendaMensalAtingivel)}/mês` },
              ].map(({ label, value }) => (
                <div key={label} style={{ backgroundColor: "#F8F9FA", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 4px" }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...CARD, marginTop: 16, border: "1px solid #E5E7EB" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#041A20", margin: "0 0 12px", textTransform: "uppercase" }}>Status da Seção</p>
            {[
              { label: "Diagnóstico revisado", ok: true },
              { label: "Projeção analisada", ok: r.patrimonioNecessario > 0 },
              { label: "Simulador executado", ok: resultadoIF !== null },
              { label: "Estratégia redigida", ok: comentario.length > 50 },
            ].map(({ label, ok }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13 }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: ok ? "#F0FDF4" : "#F3F4F6", color: ok ? "#16A34A" : "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {ok ? "✓" : "○"}
                </span>
                <span style={{ color: ok ? "#374151" : "#9CA3AF" }}>{label}</span>
              </div>
            ))}
          </div>

          {resultadoIF && (
            <div style={{ ...CARD, marginTop: 16, borderTop: "3px solid #22C55E", backgroundColor: "#F0FDF4" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#15803D", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                ✓ Resultado do Simulador
              </p>
              {[
                { label: "Patrimônio na aposentadoria", value: formatCurrency(resultadoIF.patrimonioAposentadoria) },
                { label: "Renda sustentável", value: `${formatCurrency(resultadoIF.rendaSustentavel)}/mês` },
                { label: "Gap de renda", value: formatCurrency(resultadoIF.gapRenda), color: resultadoIF.gapRenda > 0 ? "#DC2626" : "#16A34A" },
                { label: "Aporte ajustado", value: `${formatCurrency(resultadoIF.aporteAjustado)}/mês` },
                { label: "IF atingida?", value: resultadoIF.liberdadeAlcancada ? "Sim ✓" : "Não ✗", color: resultadoIF.liberdadeAlcancada ? "#16A34A" : "#DC2626" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #BBF7D0", paddingBottom: 5, marginBottom: 5, fontSize: 12 }}>
                  <span style={{ color: "#6B7280" }}>{label}</span>
                  <span style={{ fontWeight: 600, color: color ?? "#041A20" }}>{value}</span>
                </div>
              ))}
              <p style={{ fontSize: 10, color: "#6B7280", margin: "6px 0 0", textAlign: "right" }}>
                Salvo em {new Date(resultadoIF.savedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
          )}
        </div>
      </div>

      <FerramentaModal open={modalOpen} onClose={() => setModalOpen(false)} title="Simulador de Liberdade Financeira">
        <FerramentaLiberdadeFinanceira
          planejamentoIF={plan.planejamentoIF}
          onSave={(_params, _objetivos, result) => {
            onResultadoIF({
              patrimonioAposentadoria: result.patrimonioAposentadoria,
              rendaSustentavel: result.rendaSustentavel,
              gapRenda: result.gapRenda,
              liberdadeAlcancada: result.liberdadeAlcancada,
              aporteAjustado: result.aporteAjustado,
              savedAt: new Date().toISOString(),
            });
            setModalOpen(false);
          }}
        />
      </FerramentaModal>
    </>
  );
}
