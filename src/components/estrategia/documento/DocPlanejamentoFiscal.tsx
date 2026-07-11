import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import { calcularFiscal } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { nivelScore, calcularScores } from "@/lib/estrategiaScores";
import { PAGINA, HEADER_PAGINA, TITULO_SECAO, TEXTO_CORPO, LABEL_METRICA, CARD_METRICA } from "@/lib/documentoStyles";
import { RodapePagina } from "./RodapePagina";

const TIPO_DECLARACAO_LABELS: Record<string, string> = {
  completa: "Completa",
  simplificada: "Simplificada",
  nao_sei: "Não definido",
};

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  numPagina: number;
}

export function DocPlanejamentoFiscal({ nomeCliente, plan, resultados, numPagina }: Props) {
  const score = useMemo(() => calcularScores(plan, resultados).fiscalScore, [plan, resultados]);
  const storKey = `doc_coment_${plan.clientId}_fiscal`;
  const [comentario, setComentario] = useState(() => localStorage.getItem(storKey) ?? "");

  const updateComentario = (v: string) => {
    setComentario(v);
    try { localStorage.setItem(storKey, v); } catch { /**/ }
  };

  const pf = plan.fiscal;
  const nv = nivelScore(score);
  const rf = resultados.fiscal;
  const simplesF = !rf ? calcularFiscal(pf) : null;

  const rendaAnual = rf?.rendaAnual ?? pf.rendaBrutaAnual;
  const tetoPGBL = rf?.tetoPGBLAnual ?? simplesF?.tetoPGBL ?? 0;
  const economiaAnual = rf?.economiaAnual ?? simplesF?.economiaEstimadaPGBL ?? 0;
  const espacoMensal = rf?.espacoDisponivelMensal ?? ((simplesF?.espacoPGBL ?? 0) / 12);
  const aproveitandoTeto = rf?.aproveitandoTeto ?? (simplesF?.pgblAtingidoTeto ?? false);
  const tipoDeclaracaoLabel = TIPO_DECLARACAO_LABELS[pf.tipoDeclaracao] ?? "—";

  const aproveitamentoPct = tetoPGBL > 0
    ? Math.min(100, Math.round(((rf?.aporteAnual ?? simplesF?.pgblAtual ?? 0) / tetoPGBL) * 100))
    : 0;

  return (
    <div style={PAGINA} className="doc-pagina">
      {/* Header */}
      <div style={HEADER_PAGINA("#B45309")}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#B45309", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
            <i className="ti ti-receipt" style={{ fontSize: 20 }} />
          </div>
          <span style={TITULO_SECAO}>Planejamento Tributário</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: nv.bg, color: nv.color }}>{score}/100 · {nv.label}</span>
      </div>

      {/* Intro */}
      <p style={{ ...TEXTO_CORPO, marginBottom: 24 }}>
        O planejamento tributário busca maximizar sua eficiência tributária de forma legal, garantindo
        que você pague apenas o imposto devido e aproveite todos os benefícios disponíveis na
        legislação brasileira.
      </p>

      {/* Situação atual */}
      <p style={{ ...LABEL_METRICA, marginBottom: 10 }}>Situação Fiscal Atual</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Renda Anual Bruta", value: formatCurrency(rendaAnual) },
          { label: "Tipo de Declaração", value: tipoDeclaracaoLabel, color: pf.tipoDeclaracao === "nao_sei" ? "#B45309" : undefined },
          { label: "Teto PGBL (12%)", value: formatCurrency(tetoPGBL), sub: "Ao ano" },
          {
            label: "Aproveitamento",
            value: aproveitandoTeto ? "100%" : `${aproveitamentoPct}%`,
            color: aproveitamentoPct >= 80 ? "#059669" : aproveitamentoPct >= 50 ? "#B45309" : "#B91C1C",
            sub: aproveitandoTeto ? "PGBL maximizado" : "do teto utilizado",
          },
        ].map((m) => (
          <div key={m.label} style={CARD_METRICA}>
            <p style={LABEL_METRICA}>{m.label}</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: m.color ?? "#111827" }}>{m.value}</p>
            {m.sub && <p style={{ margin: "3px 0 0", fontSize: 10, color: "#9CA3AF" }}>{m.sub}</p>}
          </div>
        ))}
      </div>

      {/* Oportunidade PGBL */}
      {espacoMensal > 0 && pf.tipoDeclaracao === "completa" && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "18px 22px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <i className="ti ti-piggy-bank" style={{ fontSize: 20, color: "#2563EB" }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#2563EB" }}>Oportunidade de Diferimento Fiscal</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 10 }}>
            <div style={{ background: "white", border: "0.5px solid #BFDBFE", borderRadius: 7, padding: "10px 14px" }}>
              <p style={LABEL_METRICA}>Espaço disponível</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#2563EB" }}>
                {formatCurrency(espacoMensal)}<span style={{ fontSize: 12, fontWeight: 400 }}>/mês</span>
              </p>
            </div>
            <div style={{ background: "white", border: "0.5px solid #BFDBFE", borderRadius: 7, padding: "10px 14px" }}>
              <p style={LABEL_METRICA}>Economia anual estimada</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#059669" }}>{formatCurrency(economiaAnual)}</p>
            </div>
          </div>
          <p style={{ ...TEXTO_CORPO, color: "#1E40AF", fontSize: 12 }}>
            Aplicando <strong>{formatCurrency(espacoMensal)}/mês</strong> em PGBL, você pode reduzir
            o Imposto de Renda em até <strong>{formatCurrency(economiaAnual)}</strong> por ano.
          </p>
        </div>
      )}

      {aproveitandoTeto && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 999, background: "#DCFCE7", border: "1px solid #86EFAC", marginBottom: 16 }}>
          <i className="ti ti-check" style={{ fontSize: 14, color: "#059669" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#059669" }}>PGBL maximizado — aproveitando 100% do benefício fiscal</span>
        </div>
      )}

      {/* Rendimentos isentos */}
      {pf.temRendimentosIsentos && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ ...LABEL_METRICA, marginBottom: 7 }}>Rendimentos Isentos</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {pf.tiposRendimentosIsentos.map((tipo) => (
              <span key={tipo} style={{ fontSize: 11, padding: "2px 9px", borderRadius: 999, background: "#DCFCE7", color: "#059669", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                <i className="ti ti-check" style={{ fontSize: 10 }} /> {tipo}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Comparativo IR */}
      {rf && rf.irSemPGBL > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ ...LABEL_METRICA, marginBottom: 8 }}>Comparativo IR</p>
          {[
            { label: "IR sem PGBL", value: rf.irSemPGBL, color: "#9CA3AF" },
            { label: "IR com PGBL", value: rf.irComPGBL, color: "#059669" },
            { label: "Economia",    value: rf.economiaAnual, color: "#2563EB" },
          ].map((bar) => (
            <div key={bar.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#6B7280", width: 90, flexShrink: 0, textAlign: "right" }}>{bar.label}</span>
              <div style={{ flex: 1, height: 7, borderRadius: 4, background: "#F0F7FF", overflow: "hidden" }}>
                <div style={{ width: `${rf.irSemPGBL > 0 ? Math.min(100, (bar.value / rf.irSemPGBL) * 100) : 0}%`, height: "100%", borderRadius: 4, background: bar.color }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#111827", width: 96, flexShrink: 0 }}>{formatCurrency(bar.value)}</span>
            </div>
          ))}
        </div>
      )}

      <ConsultorBox value={comentario} onChange={updateComentario} />

      <RodapePagina nomeCliente={nomeCliente} numPagina={numPagina} totalPaginas={9} />
    </div>
  );
}

function ConsultorBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ background: "#FFFBEB", border: "0.5px solid #FDE68A", borderLeft: "4px solid #F59E0B", borderRadius: 8, padding: "12px 16px", marginTop: 8, marginBottom: 56 }}>
      <p style={{ fontSize: 10, color: "#B45309", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>Comentários do Consultor</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Adicione comentários personalizados para o cliente..."
        style={{ width: "100%", minHeight: 72, padding: "6px 8px", border: "1px solid #FDE68A", borderRadius: 6, fontSize: 12, color: "#000", resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "white" }}
      />
    </div>
  );
}
