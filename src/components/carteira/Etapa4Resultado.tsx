import { Fragment, useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Ativo, ItemPlanoAcao } from "@/lib/carteira/types";
import { calcularValorBRL, formatBRL, formatPct } from "@/lib/carteira/calculos";
import { getCard } from "@/lib/carteira/segmentos";
import type { SimplaCardId } from "@/lib/carteira/segmentos";

interface Props {
  ativosAtuais: Ativo[];
  ativosRecomendados: Ativo[];
  planoAcao: ItemPlanoAcao[];
  patrimonio: number;
  notaConsultor: string;
  clientName: string;
  clientProfile: string | null;
  usdBrl: number;
  onGoToEtapa3: () => void;
  onSave: () => void;
}

const PERFIL_LABELS_LOCAL: Record<string, string> = {
  conservador: "Conservador",
  conservador_moderado: "Conservador Moderado",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

const GRUPOS_DISPLAY = [
  { nome: "Renda Fixa", cards: ["resgate_rapido", "resgate_longo"] as SimplaCardId[], cor: "#1E40AF" },
  { nome: "RV Brasil", cards: ["acoes", "fiis"] as SimplaCardId[], cor: "#15803D" },
  { nome: "Internacional", cards: ["exterior"] as SimplaCardId[], cor: "#2563EB" },
  { nome: "Criptoativos", cards: ["cripto"] as SimplaCardId[], cor: "#2563EB" },
];

function fmtK(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return formatBRL(n);
}

export function Etapa4Resultado({
  ativosAtuais,
  ativosRecomendados,
  planoAcao,
  patrimonio,
  notaConsultor,
  clientName,
  clientProfile,
  usdBrl,
  onGoToEtapa3,
  onSave,
}: Props) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  function toggleGroup(nome: string) {
    setOpenGroups((prev) => {
      const n = new Set(prev);
      n.has(nome) ? n.delete(nome) : n.add(nome);
      return n;
    });
  }

  const grupoAtual = useMemo(
    () =>
      GRUPOS_DISPLAY.map((g) => {
        const v = ativosAtuais
          .filter((a) => g.cards.includes(a.card))
          .reduce((s, a) => s + calcularValorBRL(a, usdBrl), 0);
        const pct = patrimonio > 0 ? (v / patrimonio) * 100 : 0;
        return { nome: g.nome, valor: v, pct: Math.round(pct * 10) / 10, cor: g.cor, cards: g.cards };
      }),
    [ativosAtuais, usdBrl, patrimonio]
  );

  const grupoMeta = useMemo(
    () =>
      GRUPOS_DISPLAY.map((g) => {
        const v = ativosRecomendados
          .filter((a) => g.cards.includes(a.card))
          .reduce((s, a) => s + (a.valorMetaBRL ?? 0), 0);
        const pct = ativosRecomendados
          .filter((a) => g.cards.includes(a.card))
          .reduce((s, a) => s + (a.pctMeta ?? 0), 0);
        return { nome: g.nome, valor: v, pct: Math.round(pct * 10) / 10, cor: g.cor, cards: g.cards };
      }),
    [ativosRecomendados]
  );

  const pieAtual = grupoAtual.filter((g) => g.pct > 0);
  const pieMeta = grupoMeta.filter((g) => g.pct > 0);

  const barData = GRUPOS_DISPLAY.map((g, i) => ({
    name: g.nome.split(" ")[0] + (g.nome === "RV Brasil" ? " BR" : ""),
    Atual: grupoAtual[i].valor,
    Meta: grupoMeta[i].valor,
  })).filter((d) => d.Atual > 0 || d.Meta > 0);

  const aportes = planoAcao.filter(
    (p) => p.tipo === "aportar" || p.tipo === "novo_ativo"
  );
  const resgates = planoAcao.filter(
    (p) => p.tipo === "resgatar_parcial" || p.tipo === "resgatar_total"
  );
  const mantidos = planoAcao.filter((p) => p.tipo === "manter");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 mb-4">
        <h2 className="text-xl font-bold">{clientName}</h2>
        {clientProfile && (
          <p className="text-sm text-muted-foreground">
            Perfil: {PERFIL_LABELS_LOCAL[clientProfile] ?? clientProfile}
          </p>
        )}
      </div>

      {/* SECTION 1 — Two Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(
          [
            { title: "Carteira Atual", data: pieAtual, subtit: formatBRL(patrimonio) },
            { title: "Carteira Recomendada", data: pieMeta, subtit: formatBRL(patrimonio) },
          ] as const
        ).map(({ title, data, subtit }) => (
          <div key={title} style={{ borderRadius: 12, border: "1px solid #BFDBFE", borderTop: "3px solid #15803D", backgroundColor: "white", padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h3 className="font-semibold text-sm mb-0.5">{title}</h3>
            <p className="text-xs text-muted-foreground mb-3">{subtit}</p>
            {data.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="pct"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      innerRadius="50%"
                      outerRadius="80%"
                      paddingAngle={2}
                    >
                      {data.map((d, i) => (
                        <Cell key={i} fill={d.cor} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatPct(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {data.map((d) => (
                    <div key={d.nome} className="flex items-center gap-1 text-xs">
                      <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: d.cor }}
                      />
                      <span>{d.nome}</span>
                      <span className="text-muted-foreground">{formatPct(d.pct)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                Sem dados
              </div>
            )}
          </div>
        ))}
      </div>

      {/* SECTION 2 — Comparison Table (collapsible groups + card level) */}
      <div style={{ borderRadius: 12, border: "1px solid #BFDBFE", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ backgroundColor: "#F0F7FF", padding: "8px 16px", borderBottom: "1px solid #F0F7FF" }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, color: "#000000", margin: 0 }}>Comparativo por grupo</h3>
        </div>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "#1E3A8A" }}>
            <tr>
              <th style={{ padding: "8px 16px", textAlign: "left", color: "white", fontWeight: 600, fontSize: 11 }}>Grupo</th>
              <th style={{ padding: "8px 16px", textAlign: "right", color: "white", fontWeight: 600, fontSize: 11 }}>% Atual</th>
              <th style={{ padding: "8px 16px", textAlign: "right", color: "white", fontWeight: 600, fontSize: 11 }}>R$ Atual</th>
              <th style={{ padding: "8px 16px", textAlign: "right", color: "white", fontWeight: 600, fontSize: 11 }}>% Meta</th>
              <th style={{ padding: "8px 16px", textAlign: "right", color: "white", fontWeight: 600, fontSize: 11 }}>R$ Meta</th>
              <th style={{ padding: "8px 16px", textAlign: "right", color: "white", fontWeight: 600, fontSize: 11 }}>Dif R$</th>
              <th style={{ padding: "8px 16px", textAlign: "right", color: "white", fontWeight: 600, fontSize: 11 }}>Dif %</th>
            </tr>
          </thead>
          <tbody>
            {GRUPOS_DISPLAY.map((g, i) => {
              const atual = grupoAtual[i];
              const meta = grupoMeta[i];
              const difR = meta.valor - atual.valor;
              const difP = meta.pct - atual.pct;
              const isOpen = openGroups.has(g.nome);
              return (
                <Fragment key={g.nome}>
                  <tr
                    style={{ borderTop: "1px solid #F0F7FF", fontWeight: 600, cursor: "pointer" }}
                    onClick={() => toggleGroup(g.nome)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: g.cor }}
                        />
                        {g.nome}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">{formatPct(atual.pct)}</td>
                    <td className="px-4 py-2.5 text-right">{formatBRL(atual.valor)}</td>
                    <td className="px-4 py-2.5 text-right">{formatPct(meta.pct)}</td>
                    <td className="px-4 py-2.5 text-right">{formatBRL(meta.valor)}</td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: difR > 0 ? "#15803D" : difR < 0 ? "#B91C1C" : "#9CA3AF" }}>
                      {difR === 0 ? "—" : `${difR > 0 ? "+" : ""}${formatBRL(difR)}`}
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: difP > 0 ? "#15803D" : difP < 0 ? "#B91C1C" : "#9CA3AF" }}>
                      {difP === 0 ? "—" : `${difP > 0 ? "+" : ""}${formatPct(difP)}`}
                    </td>
                  </tr>
                  {isOpen &&
                    g.cards.map((cardId) => {
                      const card = getCard(cardId);
                      const aV = ativosAtuais
                        .filter((a) => a.card === cardId)
                        .reduce((s, a) => s + calcularValorBRL(a, usdBrl), 0);
                      const mV = ativosRecomendados
                        .filter((a) => a.card === cardId)
                        .reduce((s, a) => s + (a.valorMetaBRL ?? 0), 0);
                      const aP = patrimonio > 0 ? (aV / patrimonio) * 100 : 0;
                      const mP = ativosRecomendados
                        .filter((a) => a.card === cardId)
                        .reduce((s, a) => s + (a.pctMeta ?? 0), 0);
                      const dR = mV - aV;
                      const dP = mP - aP;
                      return (
                        <tr
                          key={cardId}
                          style={{ borderTop: "1px solid #F0F7FF", backgroundColor: "#F0F7FF", fontSize: 11, color: "#6B7280" }}
                        >
                          <td className="px-4 py-2 pl-10">{card.label}</td>
                          <td className="px-4 py-2 text-right">{formatPct(aP)}</td>
                          <td className="px-4 py-2 text-right">{formatBRL(aV)}</td>
                          <td className="px-4 py-2 text-right">{formatPct(mP)}</td>
                          <td className="px-4 py-2 text-right">{formatBRL(mV)}</td>
                          <td style={{ padding: "8px 16px", textAlign: "right", color: dR > 0 ? "#15803D" : dR < 0 ? "#B91C1C" : undefined }}>
                            {dR === 0 ? "—" : `${dR > 0 ? "+" : ""}${formatBRL(dR)}`}
                          </td>
                          <td style={{ padding: "8px 16px", textAlign: "right", color: dP > 0 ? "#15803D" : dP < 0 ? "#B91C1C" : undefined }}>
                            {dP === 0 ? "—" : `${dP > 0 ? "+" : ""}${formatPct(dP)}`}
                          </td>
                        </tr>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 font-bold">
            <tr>
              <td className="px-4 py-2.5">Total</td>
              <td className="px-4 py-2.5 text-right">
                {formatPct(grupoAtual.reduce((s, g) => s + g.pct, 0))}
              </td>
              <td className="px-4 py-2.5 text-right">{formatBRL(patrimonio)}</td>
              <td className="px-4 py-2.5 text-right">
                {formatPct(grupoMeta.reduce((s, g) => s + g.pct, 0))}
              </td>
              <td className="px-4 py-2.5 text-right">
                {formatBRL(grupoMeta.reduce((s, g) => s + g.valor, 0))}
              </td>
              <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
              <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* SECTION 3 — Bar Chart */}
      <div style={{ borderRadius: 12, border: "1px solid #BFDBFE", backgroundColor: "white", padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <h3 style={{ fontWeight: 700, fontSize: 14, color: "#000000", marginBottom: 12 }}>Atual vs. Proposta por grupo (R$)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F7FF" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={56} />
            <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 8, border: "1px solid #BFDBFE", backgroundColor: "white" }} />
            <Legend />
            <Bar dataKey="Atual" fill="#9CA3AF" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Meta" fill="#000000" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SECTION 4 — Plan Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div style={{ borderRadius: 12, border: "1px solid #BFDBFE", borderTop: "3px solid #15803D", padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h4 style={{ fontWeight: 700, fontSize: 13, color: "#15803D", marginBottom: 8 }}>Aportes e novos</h4>
          {aportes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum</p>
          ) : (
            <>
              {aportes.map((item) => {
                const card = getCard(item.card);
                return (
                  <div key={item.id} className="flex justify-between text-xs gap-2">
                    <div className="truncate flex items-center gap-1 min-w-0">
                      <span
                        className="inline-flex shrink-0 items-center text-xs rounded-full px-1.5 py-0.5 font-medium"
                        style={{ backgroundColor: card.cor + "18", color: card.cor }}
                      >
                        {card.label}
                      </span>
                      <span className="truncate">{item.nomeAtivo}</span>
                    </div>
                    <span className="text-[#15803D] font-medium shrink-0">
                      +{formatBRL(item.movimentacaoBRL)}
                    </span>
                  </div>
                );
              })}
              <div className="border-t pt-1 flex justify-between text-xs font-semibold">
                <span>Total</span>
                <span className="text-[#15803D]">
                  {formatBRL(aportes.reduce((s, p) => s + p.movimentacaoBRL, 0))}
                </span>
              </div>
            </>
          )}
        </div>
        <div style={{ borderRadius: 12, border: "1px solid #BFDBFE", borderTop: "3px solid #B91C1C", padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h4 style={{ fontWeight: 700, fontSize: 13, color: "#B91C1C", marginBottom: 8 }}>Resgates</h4>
          {resgates.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum</p>
          ) : (
            <>
              {resgates.map((item) => {
                const card = getCard(item.card);
                return (
                  <div key={item.id} className="flex justify-between text-xs gap-2">
                    <div className="truncate flex items-center gap-1 min-w-0">
                      <span
                        className="inline-flex shrink-0 items-center text-xs rounded-full px-1.5 py-0.5 font-medium"
                        style={{ backgroundColor: card.cor + "18", color: card.cor }}
                      >
                        {card.label}
                      </span>
                      <span className="truncate">{item.nomeAtivo}</span>
                    </div>
                    <span className="text-[#B91C1C] font-medium shrink-0">
                      {formatBRL(item.movimentacaoBRL)}
                    </span>
                  </div>
                );
              })}
              <div className="border-t pt-1 flex justify-between text-xs font-semibold">
                <span>Total</span>
                <span className="text-[#B91C1C]">
                  {formatBRL(resgates.reduce((s, p) => s + p.movimentacaoBRL, 0))}
                </span>
              </div>
            </>
          )}
        </div>
        <div style={{ borderRadius: 12, border: "1px solid #BFDBFE", borderTop: "3px solid #1E3A8A", padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h4 style={{ fontWeight: 700, fontSize: 13, color: "#6B7280", marginBottom: 8 }}>Mantidos</h4>
          {mantidos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum</p>
          ) : (
            mantidos.map((item) => {
              const card = getCard(item.card);
              return (
                <div key={item.id} className="flex justify-between text-xs gap-2">
                  <div className="truncate flex items-center gap-1 min-w-0">
                    <span
                      className="inline-flex shrink-0 items-center text-xs rounded-full px-1.5 py-0.5 font-medium"
                      style={{ backgroundColor: card.cor + "18", color: card.cor }}
                    >
                      {card.label}
                    </span>
                    <span className="truncate">{item.nomeAtivo}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0">
                    {formatBRL(item.valorAtualBRL)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 5 — Nota */}
      {notaConsultor && (
        <div style={{ borderRadius: 12, border: "1px solid #BFDBFE", backgroundColor: "#F0F7FF", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h3 style={{ fontWeight: 600, fontSize: 14, color: "#000000", margin: 0 }}>Notas do consultor</h3>
            <button onClick={onGoToEtapa3} style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", fontSize: 13 }}>
              Editar
            </button>
          </div>
          <p style={{ fontSize: 13, whiteSpace: "pre-wrap", color: "#6B7280", margin: 0 }}>{notaConsultor}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, paddingTop: 16, borderTop: "1px solid #BFDBFE" }}>
        <button onClick={onSave} style={{ backgroundColor: "#15803D", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Salvar carteira
        </button>
        <button onClick={() => window.print()} style={{ backgroundColor: "white", color: "#000000", border: "1.5px solid #000000", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Imprimir / PDF
        </button>
      </div>
    </div>
  );
}
