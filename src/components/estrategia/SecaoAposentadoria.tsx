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
          <div style={{ ...CARD, borderTop: "3px solid #3D6B41" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Diagnóstico IF
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {[
                { label: "Idade atual", value: `${p.idadeAtual} anos` },
                { label: "Idade meta IF", value: `${p.idadeMeta} anos` },
                { label: "Renda desejada na IF", value: `${formatCurrency(p.rendaMensalDesejada)}/mês`, color: "#2A4F6A" },
                { label: "Renda atingível", value: `${formatCurrency(r.rendaMensalAtingivel)}/mês`, color: r.rendaMensalAtingivel >= p.rendaMensalDesejada ? "#3D6B41" : "#7A3535" },
                { label: "Patrimônio necessário", value: formatCurrency(r.patrimonioNecessario), color: "#000000" },
                { label: "Projeção c/ aportes", value: formatCurrency(r.patrimonioProjetado), color: "#3D6B41" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>{label}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: color ?? "#000000", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#3D3520", marginBottom: 6 }}>
                <span>{formatNumber(r.percentualIF, 0)}% do caminho percorrido</span>
                <span style={{ color: "#3D6B41", fontWeight: 600 }}>{formatNumber(r.percentualIF, 0)}%</span>
              </div>
              <div style={{ height: 8, backgroundColor: "#F5F3EE", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, r.percentualIF)}%`, backgroundColor: "#3D6B41", borderRadius: 4, transition: "width 0.4s" }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6B6347" }}>Gap patrimonial</span>
                <span style={{ fontWeight: 600, color: r.gap > 0 ? "#7A3535" : "#3D6B41" }}>
                  {r.gap > 0 ? "-" : "+"}{formatCurrency(Math.abs(r.gap))}
                </span>
              </div>
              {aporteNecessario > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#6B6347" }}>Aporte necessário</span>
                  <span style={{ fontWeight: 600, color: "#8A7A45" }}>{formatCurrency(aporteNecessario)}/mês</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6B6347" }}>Renda sustentável</span>
                <span style={{ fontWeight: 600, color: "#000000" }}>{formatCurrency(r.rendaMensalAtingivel)}/mês</span>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              style={{ marginTop: 16, width: "100%", padding: "9px 0", border: "1px solid #3D6B41", borderRadius: 6, backgroundColor: "transparent", color: "#3D6B41", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
            >
              Simulador completo de IF →
            </button>
          </div>

          {/* Estratégia card */}
          <div style={{ ...CARD, borderTop: "3px solid #000000", marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Pencil style={{ width: 14, height: 14, color: "#6B6347" }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: 0 }}>Estratégia e Recomendações</p>
            </div>
            <div style={{ position: "relative" }}>
              <textarea
                value={comentario}
                onChange={(e) => handleComentario(e.target.value)}
                placeholder="Ex: Para atingir a IF aos 60 anos, o cliente precisa aumentar o aporte mensal de R$ 3.000 para R$ 4.500..."
                style={{ width: "100%", minHeight: 200, padding: "10px 12px", borderRadius: 6, border: "1px solid #E2DCC8", fontSize: 13, color: "#000000", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
              <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#9E9070" }}>{comentario.length} caracteres</span>
            </div>
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6B6347", marginRight: 4 }}>Tags:</span>
              {AVAILABLE_TAGS.map((t) => (
                <button key={t} onClick={() => toggleTag(t)} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, cursor: "pointer", border: "1px solid #E2DCC8", backgroundColor: tags.includes(t) ? "#000000" : "transparent", color: tags.includes(t) ? "white" : "#3D3520" }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <span style={{ fontSize: 11, color: "#9E9070" }}>{lastEdit ? `Última edição: ${lastEdit}` : "Não editado"}</span>
              <button style={{ fontSize: 12, padding: "5px 14px", borderRadius: 6, backgroundColor: "#000000", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}>Salvar</button>
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div>
          <div style={{ ...CARD, borderTop: "3px solid #3D6B41" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Projeção Patrimonial</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={projecaoData}>
                <defs>
                  <linearGradient id="gradIF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2A4F6A" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2A4F6A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="idade" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={formatAxis} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => formatCurrency(v as number)} labelFormatter={(l) => `Idade ${l}`} />
                <ReferenceLine y={r.patrimonioNecessario} stroke="#7A3535" strokeDasharray="4 4" label={{ value: "Meta", position: "right", fontSize: 10, fill: "#7A3535" }} />
                <Area type="monotone" dataKey="projecao" name="Projeção" stroke="#2A4F6A" fill="url(#gradIF)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              {[
                { label: "Anos restantes", value: `${anosRestantes} anos` },
                { label: "Renda desejada", value: `${formatCurrency(p.rendaMensalDesejada)}/mês` },
                { label: "Renda atingível", value: `${formatCurrency(r.rendaMensalAtingivel)}/mês` },
              ].map(({ label, value }) => (
                <div key={label} style={{ backgroundColor: "#F5F3EE", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px" }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...CARD, marginTop: 16, border: "1px solid #E2DCC8" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: "0 0 12px", textTransform: "uppercase" }}>Status da Seção</p>
            {[
              { label: "Diagnóstico revisado", ok: true },
              { label: "Projeção analisada", ok: r.patrimonioNecessario > 0 },
              { label: "Simulador executado", ok: resultadoIF !== null },
              { label: "Estratégia redigida", ok: comentario.length > 50 },
            ].map(({ label, ok }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13 }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: ok ? "#EBF2EC" : "#F5F3EE", color: ok ? "#3D6B41" : "#9E9070", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {ok ? "✓" : "○"}
                </span>
                <span style={{ color: ok ? "#3D3520" : "#9E9070" }}>{label}</span>
              </div>
            ))}
          </div>

          {resultadoIF && (
            <div style={{ ...CARD, marginTop: 16, borderTop: "3px solid #3D6B41", backgroundColor: "#EBF2EC" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#3D6B41", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                ✓ Resultado do Simulador
              </p>
              {[
                { label: "Patrimônio na aposentadoria", value: formatCurrency(resultadoIF.patrimonioAposentadoria) },
                { label: "Renda sustentável", value: `${formatCurrency(resultadoIF.rendaSustentavel)}/mês` },
                { label: "Gap de renda", value: formatCurrency(resultadoIF.gapRenda), color: resultadoIF.gapRenda > 0 ? "#7A3535" : "#3D6B41" },
                { label: "Aporte ajustado", value: `${formatCurrency(resultadoIF.aporteAjustado)}/mês` },
                { label: "IF atingida?", value: resultadoIF.liberdadeAlcancada ? "Sim ✓" : "Não ✗", color: resultadoIF.liberdadeAlcancada ? "#3D6B41" : "#7A3535" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #BBF7D0", paddingBottom: 5, marginBottom: 5, fontSize: 12 }}>
                  <span style={{ color: "#6B6347" }}>{label}</span>
                  <span style={{ fontWeight: 600, color: color ?? "#000000" }}>{value}</span>
                </div>
              ))}
              <p style={{ fontSize: 10, color: "#6B6347", margin: "6px 0 0", textAlign: "right" }}>
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
