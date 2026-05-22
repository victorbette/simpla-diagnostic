import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import { FerramentaCarteira } from "@/components/carteira";
import type { ResultadoCarteira, MacroAlocacao } from "@/types/estrategiaResultados";
import type { CarteiraResultado, Ativo } from "@/lib/carteira/types";

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

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const ASSET_KEYS: (keyof MacroAlocacao)[] = ["rendaFixa", "acoes", "fiis", "rvGlobal", "rfGlobal", "cripto"];
const ASSET_LABELS: Record<keyof MacroAlocacao, string> = {
  rendaFixa: "Renda Fixa",
  acoes: "Ações BR",
  fiis: "FIIs",
  rvGlobal: "RV Global",
  rfGlobal: "RF Global",
  cripto: "Cripto",
};
const ASSET_COLORS: Record<keyof MacroAlocacao, string> = {
  rendaFixa: "#2A4F6A",
  acoes: "#3D6B41",
  fiis: "#4A6B3D",
  rvGlobal: "#000000",
  rfGlobal: "#6B6347",
  cripto: "#BBA866",
};

const AVAILABLE_TAGS = ["Rebalanceamento", "ETFs", "Renda Fixa", "Renda Variável", "Internacional"];

function computeMacro(ativos: Ativo[], total: number): MacroAlocacao {
  const soma: Record<string, number> = {};
  for (const a of ativos) soma[a.card] = (soma[a.card] ?? 0) + a.valorBRL;
  const t = total || 1;
  return {
    rendaFixa: ((soma["resgate_rapido"] ?? 0) + (soma["resgate_longo"] ?? 0)) / t * 100,
    acoes: (soma["acoes"] ?? 0) / t * 100,
    fiis: (soma["fiis"] ?? 0) / t * 100,
    rvGlobal: (soma["exterior"] ?? 0) / t * 100,
    rfGlobal: 0,
    cripto: (soma["cripto"] ?? 0) / t * 100,
  };
}

export function SecaoAssetAllocation({
  plan,
  clientName,
  comentario,
  onComentarioChange,
  tags,
  onTagsChange,
  resultadoCarteira,
  onResultadoCarteira,
}: Props) {
  const [carteiraOpen, setCarteiraOpen] = useState(false);

  function handleCarteiraSave(r: CarteiraResultado) {
    const total = r.patrimonio || 1;
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
      macroAtual: computeMacro(r.ativosAtuais, total),
      macroMeta: computeMacro(r.ativosRecomendados, total),
      planoAcao: r.planoAcao.map((i) => ({
        id: i.id,
        nomeAtivo: i.nomeAtivo,
        segmento: i.segmento,
        tipo: i.tipo,
        valorAtualBRL: i.valorAtualBRL,
        valorMetaBRL: i.valorMetaBRL,
        movimentacaoBRL: i.movimentacaoBRL,
        prioridade: i.prioridade,
      })),
      dataCalculo: new Date().toISOString(),
      savedAt: new Date().toISOString(),
    });
    setCarteiraOpen(false);
  }

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  const perfilKey = plan.dadosCliente.suitabilityPerfil ?? null;
  const perfilLabel = perfilKey ? (PERFIL_LABELS[perfilKey as keyof typeof PERFIL_LABELS] ?? perfilKey) : "Não definido";
  const patrimonio = plan.ativosAtuais?.total ?? 0;

  return (
    <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Card 1: Carteira e Asset Allocation */}
      <div style={{ ...CARD, borderTop: "3px solid #000000" }}>
        {resultadoCarteira ? (
          /* TOOL RESULT STATE */
          <div>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Carteira e Asset Allocation
                </p>
                <span style={{ fontSize: 11, color: "#6B6347", marginTop: 4, display: "block" }}>
                  Calculado em {new Date(resultadoCarteira.dataCalculo).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              <button
                onClick={() => setCarteiraOpen(true)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#BBA866",
                  color: "#000000",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Abrir ferramenta →
              </button>
            </div>

            {/* 3 metrics row */}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <div style={{ flex: 1, backgroundColor: "#F5F3EE", borderRadius: 8, padding: "12px 16px" }}>
                <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Patrimônio</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#2A4F6A", margin: 0 }}>
                  {formatCurrency(resultadoCarteira.patrimonio)}
                </p>
              </div>
              <div style={{ flex: 1, backgroundColor: "#F5F3EE", borderRadius: 8, padding: "12px 16px" }}>
                <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Total a Aportar</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#3D6B41", margin: 0 }}>
                  {formatCurrency(resultadoCarteira.totalAportar)}
                </p>
              </div>
              <div style={{ flex: 1, backgroundColor: "#F5F3EE", borderRadius: 8, padding: "12px 16px" }}>
                <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Total a Resgatar</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#7A3535", margin: 0 }}>
                  {formatCurrency(resultadoCarteira.totalResgatar)}
                </p>
              </div>
            </div>

            {/* Section title */}
            <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: "20px 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Alocação Atual vs Proposta
            </p>

            {/* Two side-by-side pie charts */}
            <div style={{ display: "flex", gap: 8 }}>
              {/* Atual */}
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={ASSET_KEYS.map((k) => ({ name: ASSET_LABELS[k], value: parseFloat(resultadoCarteira.macroAtual[k].toFixed(1)) }))}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={35}
                    >
                      {ASSET_KEYS.map((k, i) => (
                        <Cell key={i} fill={ASSET_COLORS[k]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v}%`]} />
                  </PieChart>
                </ResponsiveContainer>
                <p style={{ textAlign: "center", fontSize: 12, color: "#6B6347", margin: "4px 0 0" }}>Atual</p>
              </div>
              {/* Proposta */}
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={ASSET_KEYS.map((k) => ({ name: ASSET_LABELS[k], value: parseFloat(resultadoCarteira.macroMeta[k].toFixed(1)) }))}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={35}
                    >
                      {ASSET_KEYS.map((k, i) => (
                        <Cell key={i} fill={ASSET_COLORS[k]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v}%`]} />
                  </PieChart>
                </ResponsiveContainer>
                <p style={{ textAlign: "center", fontSize: 12, color: "#6B6347", margin: "4px 0 0" }}>Proposta</p>
              </div>
            </div>

            {/* Legend table */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "6px 16px", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6B6347", textTransform: "uppercase" }}>Classe</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6B6347", textTransform: "uppercase", textAlign: "right" }}>Atual</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6B6347", textTransform: "uppercase", textAlign: "right" }}>Meta</span>
              </div>
              {ASSET_KEYS.filter((k) => resultadoCarteira.macroAtual[k] > 0.5 || resultadoCarteira.macroMeta[k] > 0.5).map((k) => (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "4px 16px", alignItems: "center", paddingBottom: 4, marginBottom: 4, borderBottom: "1px solid #F5F3EE" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#000000" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: ASSET_COLORS[k], flexShrink: 0 }} />
                    {ASSET_LABELS[k]}
                  </div>
                  <span style={{ fontSize: 12, color: "#000000", textAlign: "right" }}>{formatNumber(resultadoCarteira.macroAtual[k], 1)}%</span>
                  <span style={{ fontSize: 12, color: "#000000", textAlign: "right" }}>{formatNumber(resultadoCarteira.macroMeta[k], 1)}%</span>
                </div>
              ))}
            </div>

            {/* Action plan */}
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Plano de ação
              </p>
              {(() => {
                const actionItems = resultadoCarteira.planoAcao.filter((i) => i.tipo !== "manter");
                const displayed = actionItems.slice(0, 5);
                const remaining = actionItems.length - displayed.length;
                return (
                  <>
                    {displayed.map((item) => {
                      const isAportar = item.tipo === "aportar" || item.tipo === "novo_ativo";
                      const isResgatar = item.tipo === "resgatar_parcial" || item.tipo === "resgatar_total";
                      const movColor = isAportar ? "#3D6B41" : isResgatar ? "#7A3535" : "#000000";
                      const movPrefix = isAportar ? "+" : isResgatar ? "-" : "";
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 0",
                            borderBottom: "1px solid #F5F3EE",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, color: "#000000" }}>{item.nomeAtivo}</span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: 999,
                                backgroundColor:
                                  item.prioridade === "alta"
                                    ? "#FCE8E8"
                                    : item.prioridade === "media"
                                    ? "#FEF3DC"
                                    : "#EDE9DC",
                                color:
                                  item.prioridade === "alta"
                                    ? "#7A3535"
                                    : item.prioridade === "media"
                                    ? "#8A7A45"
                                    : "#6B6347",
                                textTransform: "uppercase",
                              }}
                            >
                              {item.prioridade}
                            </span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: movColor }}>
                            {movPrefix}{formatCurrency(Math.abs(item.movimentacaoBRL))}
                          </span>
                        </div>
                      );
                    })}
                    {remaining > 0 && (
                      <p style={{ fontSize: 12, color: "#6B6347", margin: "8px 0 0" }}>
                        e mais {remaining} movimentaç{remaining === 1 ? "ão" : "ões"}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          /* EMPTY STATE */
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Carteira e Asset Allocation
            </p>
            <div
              style={{
                backgroundColor: "#F5F3EE",
                borderRadius: 8,
                padding: "32px 24px",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 13, color: "#6B6347", margin: "0 0 6px" }}>
                Ferramenta de carteira não executada
              </p>
              <p style={{ fontSize: 12, color: "#9E9070", margin: 0 }}>
                Patrimônio atual: {formatCurrency(patrimonio)} · Perfil: {perfilLabel}
              </p>
              <button
                onClick={() => setCarteiraOpen(true)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#BBA866",
                  color: "#000000",
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  marginTop: 12,
                  fontSize: 13,
                }}
              >
                Abrir ferramenta de carteira →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card 2: Comment */}
      <div style={{ ...CARD, borderTop: "3px solid #000000" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Estratégia e Recomendações
        </p>
        <div style={{ position: "relative" }}>
          <textarea
            value={comentario}
            onChange={(e) => onComentarioChange(e.target.value)}
            placeholder="Descreva a estratégia de asset allocation recomendada: rebalanceamento, classes de ativos prioritários, instrumentos sugeridos..."
            style={{
              width: "100%",
              minHeight: 180,
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #E2DCC8",
              fontSize: 13,
              color: "#000000",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: 8,
              right: 10,
              fontSize: 11,
              color: "#9E9070",
            }}
          >
            {comentario.length} caracteres
          </span>
        </div>
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6B6347", marginRight: 4 }}>Tags:</span>
          {AVAILABLE_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              style={{
                fontSize: 12,
                padding: "3px 10px",
                borderRadius: 999,
                cursor: "pointer",
                border: "1px solid #E2DCC8",
                backgroundColor: tags.includes(t) ? "#000000" : "transparent",
                color: tags.includes(t) ? "white" : "#3D3520",
              }}
            >
              {t}
            </button>
          ))}
        </div>
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
