import type { Ativo } from "@/lib/carteira/types";
import { CARD_ORDER, CARD_META } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";

interface Props {
  ativosRecomendados: Ativo[];
  macroMeta: Record<string, number>;
  patrimonio: number;
  titulo?: string;
  subtitulo?: string;
}

export function CardSelecaoAtivos({
  ativosRecomendados,
  macroMeta,
  patrimonio,
  titulo = "Seleção de Ativos Recomendados",
  subtitulo = "Carteira recomendada por classe",
}: Props) {
  if (ativosRecomendados.length === 0) return null;

  return (
    <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #F3F4F6" }}>
        <i className="ti ti-list-check" style={{ fontSize: 18, color: "#2563EB" }} aria-hidden="true" />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{titulo}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{subtitulo}</div>
        </div>
      </div>

      {CARD_ORDER.map((cardId) => {
        const ativos = ativosRecomendados.filter((a) => a.card === cardId);
        if (ativos.length === 0) return null;
        const meta = CARD_META[cardId];
        const pct = Number(macroMeta[cardId]) || 0;
        const brlMeta = (pct / 100) * patrimonio;
        const totalGrupo = ativos.reduce((s, a) => s + (Number(a.valorBRL) || 0), 0);
        const isRF = cardId === "resgate_longo" || cardId === "resgate_rapido";
        const cols = isRF ? "2.5fr 1.2fr 1fr 1fr" : "2.5fr 1.5fr 1fr";

        return (
          <div key={cardId} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F3F4F6", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className={`ti ${meta.icone}`} style={{ fontSize: 15, color: meta.cor }} aria-hidden="true" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{meta.label}</span>
                <span style={{ fontSize: 10, color: "#6B7280", background: "#F3F4F6", padding: "2px 8px", borderRadius: 99 }}>
                  {pct.toFixed(1)}% · {formatBRL(brlMeta)}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{formatBRL(totalGrupo)}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: cols, padding: "4px 8px", fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", background: "#F8FAFF", borderRadius: 6, marginBottom: 4 }}>
              <span>Ativo</span>
              <span>Segmento</span>
              {isRF && <span>Vencimento</span>}
              <span style={{ textAlign: "right" }}>R$ Meta</span>
            </div>

            {ativos.map((ativo) => (
              <div key={ativo.id} style={{ display: "grid", gridTemplateColumns: cols, padding: "9px 8px", borderBottom: "0.5px solid #F9FAFB", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{ativo.nome || "—"}</span>
                <span style={{ fontSize: 10, color: "#374151", background: "#F3F4F6", padding: "2px 8px", borderRadius: 99, display: "inline-block", maxWidth: "fit-content" }}>
                  {ativo.segmento || "—"}
                </span>
                {isRF && <span style={{ fontSize: 12, color: "#6B7280" }}>{ativo.vencimento || "—"}</span>}
                <span style={{ fontSize: 13, fontWeight: 500, color: "#111827", textAlign: "right" }}>{formatBRL(Number(ativo.valorBRL) || 0)}</span>
              </div>
            ))}
          </div>
        );
      })}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E5E7EB", paddingTop: 14, marginTop: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Total da carteira recomendada</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{formatBRL(patrimonio)}</span>
      </div>
    </div>
  );
}
