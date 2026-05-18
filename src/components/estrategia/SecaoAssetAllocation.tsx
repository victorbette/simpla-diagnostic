import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Pencil } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  calcularAlocacaoAtual,
  ALOCACAO_ALVO,
  PERFIL_LABELS,
} from "@/types/financialPlanning";
import type { FinancialPlan, PerfilRisco, MacroalocacaoAlvo } from "@/types/financialPlanning";
import { FerramentaCarteira } from "@/components/carteira";
import type { ResultadoCarteira } from "@/types/estrategiaResultados";
import type { CarteiraResultado } from "@/lib/carteira/types";

interface Props {
  plan: FinancialPlan;
  clientName: string;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoCarteira: ResultadoCarteira | null;
  onResultadoCarteira: (r: ResultadoCarteira) => void;
}

const ASSET_KEYS: (keyof MacroalocacaoAlvo)[] = ["rendaFixa", "acoes", "fiis", "rvGlobal", "rfGlobal", "cripto"];
const ASSET_LABELS: Record<keyof MacroalocacaoAlvo, string> = {
  rendaFixa: "Renda Fixa", acoes: "Ações BR", fiis: "FIIs",
  rvGlobal: "RV Global", rfGlobal: "RF Global", cripto: "Cripto",
};
const ASSET_COLORS: Record<keyof MacroalocacaoAlvo, string> = {
  rendaFixa: "#3B82F6", acoes: "#22C55E", fiis: "#A78BFA",
  rvGlobal: "#F97316", rfGlobal: "#06B6D4", cripto: "#EAB308",
};

const AVAILABLE_TAGS = ["Rebalanceamento", "ETFs", "Renda Fixa", "Renda Variável", "Internacional"];

const CARD: React.CSSProperties = {
  backgroundColor: "white", borderRadius: 12, padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

function Gauge({ score }: { score: number }) {
  const r = 36, cx = 46, cy = 44;
  const circ = Math.PI * r;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circ;
  const color = score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <svg width="92" height="52" viewBox="0 0 92 52">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${filled} ${circ}`} />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}

export function SecaoAssetAllocation({ plan, clientName, comentario, onComentarioChange, tags, onTagsChange, resultadoCarteira, onResultadoCarteira }: Props) {
  const [lastEdit, setLastEdit] = useState<string>("");
  const [carteiraOpen, setCarteiraOpen] = useState(false);

  function handleCarteiraSave(r: CarteiraResultado) {
    const totalAportar = r.planoAcao
      .filter((i) => i.tipo === "aportar" || i.tipo === "novo_ativo")
      .reduce((s, i) => s + i.movimentacaoBRL, 0);
    const totalResgatar = r.planoAcao
      .filter((i) => i.tipo === "resgatar_parcial" || i.tipo === "resgatar_total")
      .reduce((s, i) => s + Math.abs(i.movimentacaoBRL), 0);
    onResultadoCarteira({
      patrimonio: r.patrimonio,
      planoAcaoCount: r.planoAcao.length,
      totalAportar,
      totalResgatar,
      savedAt: new Date().toISOString(),
    });
    setCarteiraOpen(false);
  }

  const perfil = plan.dadosCliente.suitabilityPerfil ?? plan.suitability?.perfil ?? null;
  const total = plan.ativosAtuais.total || ASSET_KEYS.reduce((s, k) => s + plan.ativosAtuais[k], 0);
  const alocacaoAtual = calcularAlocacaoAtual({ ...plan.ativosAtuais, total: total || 1 });
  const alvo: MacroalocacaoAlvo | null = perfil ? ALOCACAO_ALVO[perfil as PerfilRisco] : null;
  const ifScore = Math.round(Math.min(100, total > 0 ? 60 : 0));

  const gaps = alvo
    ? ASSET_KEYS.filter((k) => Math.abs(alocacaoAtual[k] - alvo[k]) > 5).map((k) => ({
        key: k,
        label: ASSET_LABELS[k],
        diff: alocacaoAtual[k] - alvo[k],
      }))
    : [];

  const pieData = ASSET_KEYS.filter((k) => plan.ativosAtuais[k] > 0).map((k) => ({
    name: ASSET_LABELS[k], value: parseFloat(alocacaoAtual[k].toFixed(1)),
    color: ASSET_COLORS[k], raw: plan.ativosAtuais[k],
  }));

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  function handleComentario(v: string) {
    onComentarioChange(v);
    setLastEdit(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>
      {/* Coluna esquerda */}
      <div>
        {/* Diagnóstico card */}
        <div style={{ ...CARD, borderTop: "3px solid #7C3AED", position: "relative" }}>
          <span style={{ position: "absolute", top: 16, right: 16, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: "#F5F3FF", color: "#7C3AED" }}>
            SOMENTE LEITURA
          </span>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Diagnóstico Inicial
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 6px", textTransform: "uppercase", fontWeight: 600 }}>Perfil de Risco</p>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, backgroundColor: "#F5F3FF", color: "#7C3AED" }}>
                {perfil ? PERFIL_LABELS[perfil as PerfilRisco] : "Não definido"}
              </span>
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 2px", textTransform: "uppercase", fontWeight: 600 }}>Score AA</p>
              <Gauge score={ifScore} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Patrimônio Financeiro</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#0F766E", margin: 0 }}>{formatCurrency(total)}</p>
            </div>
            {alvo && (
              <div>
                <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 6px", textTransform: "uppercase", fontWeight: 600 }}>RF Atual vs Meta</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: "#6B7280", width: 40 }}>Atual</span>
                    <div style={{ flex: 1, height: 6, backgroundColor: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, alocacaoAtual.rendaFixa)}%`, backgroundColor: "#041A20", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 10, color: "#041A20", fontWeight: 600 }}>{formatNumber(alocacaoAtual.rendaFixa, 0)}%</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: "#6B7280", width: 40 }}>Meta</span>
                    <div style={{ flex: 1, height: 6, backgroundColor: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, alvo.rendaFixa)}%`, backgroundColor: "#BBA866", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 10, color: "#BBA866", fontWeight: 600 }}>{alvo.rendaFixa}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {gaps.length > 0 && (
            <div style={{ backgroundColor: "#FAFAFA", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", margin: "0 0 8px", textTransform: "uppercase" }}>Gaps identificados</p>
              {gaps.map((g) => (
                <div key={g.key} style={{ fontSize: 12, color: g.diff > 0 ? "#B45309" : "#DC2626", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: g.diff > 0 ? "#F59E0B" : "#EF4444", flexShrink: 0 }} />
                  {g.label} {g.diff > 0 ? "acima" : "abaixo"} do recomendado: {g.diff > 0 ? "+" : ""}{formatNumber(g.diff, 1)}%
                </div>
              ))}
            </div>
          )}
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
              placeholder="Descreva a estratégia de asset allocation recomendada: rebalanceamento, classes de ativos prioritários, instrumentos sugeridos..."
              style={{
                width: "100%", minHeight: 200, padding: "10px 12px", borderRadius: 6, border: "1px solid #E5E7EB",
                fontSize: 13, color: "#041A20", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
            <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#9CA3AF" }}>{comentario.length} caracteres</span>
          </div>

          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#6B7280", marginRight: 4 }}>Tags:</span>
            {AVAILABLE_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                style={{
                  fontSize: 12, padding: "3px 10px", borderRadius: 999, cursor: "pointer",
                  border: "1px solid #E5E7EB",
                  backgroundColor: tags.includes(t) ? "#041A20" : "transparent",
                  color: tags.includes(t) ? "white" : "#374151",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>
              {lastEdit ? `Última edição: ${lastEdit}` : "Não editado"}
            </span>
            <button style={{ fontSize: 12, padding: "5px 14px", borderRadius: 6, backgroundColor: "#041A20", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}>
              Salvar
            </button>
          </div>
        </div>
      </div>

      {/* Coluna direita */}
      <div>
        {/* Carteira card */}
        <div style={{ ...CARD, borderTop: "3px solid #7C3AED" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: 0 }}>Carteira Atual</p>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, backgroundColor: total > 0 ? "#F0FDF4" : "#F3F4F6", color: total > 0 ? "#16A34A" : "#6B7280", fontWeight: 600 }}>
              {total > 0 ? "✓ Com dados" : "Sem dados"}
            </span>
          </div>

          {total > 0 && pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40} labelLine={false}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v}%`, name]} />
                </PieChart>
              </ResponsiveContainer>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: d.color, flexShrink: 0 }} />
                      {d.name}
                    </div>
                    <span style={{ color: "#6B7280" }}>{d.value}%</span>
                    <span style={{ color: "#041A20", fontWeight: 600 }}>{formatCurrency(d.raw)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#9CA3AF" }}>
              <p style={{ fontSize: 13, margin: "0 0 12px" }}>Carteira detalhada não montada</p>
              <button
                onClick={() => setCarteiraOpen(true)}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1.5px solid #7C3AED", backgroundColor: "transparent", color: "#7C3AED", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
              >
                Montar carteira detalhada →
              </button>
            </div>
          )}

          {total > 0 && (
            <button
              onClick={() => setCarteiraOpen(true)}
              style={{ marginTop: 12, width: "100%", padding: "8px 0", border: "1.5px solid #7C3AED", borderRadius: 6, backgroundColor: "transparent", color: "#7C3AED", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
            >
              Abrir ferramenta de carteira →
            </button>
          )}
        </div>

        {/* Status card */}
        <div style={{ ...CARD, marginTop: 16, border: "1px solid #E5E7EB" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#041A20", margin: "0 0 12px", textTransform: "uppercase" }}>Status da Seção</p>
          {[
            { label: "Diagnóstico revisado", ok: true },
            { label: "Ferramenta de carteira usada", ok: resultadoCarteira !== null },
            { label: "Carteira com dados", ok: total > 0 },
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

        {resultadoCarteira && (
          <div style={{ ...CARD, marginTop: 16, borderTop: "3px solid #7C3AED", backgroundColor: "#F5F3FF" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#5B21B6", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              ✓ Resultado da Ferramenta
            </p>
            {[
              { label: "Patrimônio mapeado", value: formatCurrency(resultadoCarteira.patrimonio) },
              { label: "Itens no plano de ação", value: `${resultadoCarteira.planoAcaoCount}` },
              { label: "Total a aportar", value: formatCurrency(resultadoCarteira.totalAportar), color: "#16A34A" },
              { label: "Total a resgatar", value: formatCurrency(resultadoCarteira.totalResgatar), color: "#DC2626" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #DDD6FE", paddingBottom: 5, marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: "#6B7280" }}>{label}</span>
                <span style={{ fontWeight: 600, color: color ?? "#041A20" }}>{value}</span>
              </div>
            ))}
            <p style={{ fontSize: 10, color: "#6B7280", margin: "6px 0 0", textAlign: "right" }}>
              Salvo em {new Date(resultadoCarteira.savedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </p>
          </div>
        )}
      </div>

      {carteiraOpen && (
        <FerramentaCarteira
          clientName={clientName}
          clientId={plan.clientId}
          clientProfile={plan.dadosCliente.suitabilityPerfil ?? plan.suitability?.perfil ?? null}
          patrimonyInicial={plan.ativosAtuais.total}
          onClose={() => setCarteiraOpen(false)}
          onSave={handleCarteiraSave}
        />
      )}
    </div>
  );
}
