import { gerarAcoes } from "@/lib/estrategiaAcoes";
import type { AcaoEstrategia } from "@/lib/estrategiaAcoes";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  clientName: string;
  comentariosFinais: string;
  onComentariosFinaisChange: (v: string) => void;
}

const PRIORIDADE_BADGE = {
  alta:  { color: "#B91C1C", bg: "#FEE2E2", label: "Alta" },
  media: { color: "#B45309", bg: "#FEF3C7", label: "Média" },
  baixa: { color: "#6B7280", bg: "#F3F4F6", label: "Baixa" },
} as const;

function AcaoCard({ acao, num }: { acao: AcaoEstrategia; num?: number }) {
  const pb = PRIORIDADE_BADGE[acao.prioridade];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "#F8FAFF", borderRadius: "0 8px 8px 0", border: `0.5px solid #BFDBFE`, borderLeft: `3px solid ${pb.color}` }}>
      {num !== undefined && (
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: pb.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: pb.color }}>{num}</span>
        </div>
      )}
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.4 }}>{acao.texto}</p>
        <p style={{ margin: "3px 0 0", fontSize: 11, color: acao.areaColor }}>{acao.area}</p>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: pb.bg, color: pb.color, flexShrink: 0 }}>
        {pb.label}
      </span>
    </div>
  );
}

export function DocProximosPassos({ plan, resultados, clientName, comentariosFinais, onComentariosFinaisChange }: Props) {
  const todasAcoes = gerarAcoes(plan, resultados);
  const acoesAlta = todasAcoes.filter((a) => a.prioridade === "alta");
  const acoesMedia = todasAcoes.filter((a) => a.prioridade === "media");

  const data = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  // 30/60/90 days: alta = 30 days, média = 60 days, baixa = 90 days
  const acoes30 = acoesAlta.slice(0, 3);
  const acoes60 = [...acoesAlta.slice(3), ...acoesMedia.slice(0, 3)];
  const acoes90 = acoesMedia.slice(3);

  return (
    <div className="doc-page" style={{ background: "white", minHeight: "297mm" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", paddingBottom: 16, borderBottom: "2px solid #1E3A8A", marginBottom: 28, gap: 12 }}>
        <div style={{ width: 44, height: 44, background: "#1E3A8A", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>✅</div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1E3A8A" }}>Próximos Passos</h2>
      </div>

      {/* Intro */}
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, marginBottom: 28 }}>
        Para que sua estratégia saia do papel, listamos abaixo as ações recomendadas em ordem
        de prioridade. Nosso time estará ao seu lado em cada etapa, <strong>{clientName}</strong>.
      </p>

      {/* Alta priority */}
      {acoesAlta.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#B91C1C", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Ações Imediatas
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {acoesAlta.map((a, i) => <AcaoCard key={a.id} acao={a} num={i + 1} />)}
          </div>
        </div>
      )}

      {/* Média priority */}
      {acoesMedia.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Ações Recomendadas
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {acoesMedia.map((a) => <AcaoCard key={a.id} acao={a} />)}
          </div>
        </div>
      )}

      {/* Timeline */}
      {(acoes30.length > 0 || acoes60.length > 0 || acoes90.length > 0) && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Linha do Tempo Sugerida
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {(
              [
                { label: "30 dias", color: "#B91C1C", bg: "#FEE2E2", acoes: acoes30 },
                { label: "60 dias", color: "#B45309", bg: "#FEF3C7", acoes: acoes60 },
                { label: "90 dias", color: "#6B7280", bg: "#F3F4F6", acoes: acoes90 },
              ] as const
            ).map((col) => (
              <div key={col.label} style={{ background: col.bg, borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: col.color }}>{col.label}</p>
                {col.acoes.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                    {col.acoes.map((a) => (
                      <li key={a.id} style={{ fontSize: 11, color: "#374151" }}>{a.texto}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF", fontStyle: "italic" }}>Sem ações neste período</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consultant final comments */}
      <div style={{ background: "#FFFBEB", border: "0.5px solid #FDE68A", borderLeft: "4px solid #F59E0B", borderRadius: 8, padding: "14px 18px", marginBottom: 28 }}>
        <p style={{ margin: "0 0 8px", fontSize: 10, color: "#B45309", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Comentários Finais do Consultor</p>
        <textarea
          value={comentariosFinais}
          onChange={(e) => onComentariosFinaisChange(e.target.value)}
          placeholder="Mensagem final personalizada para o cliente..."
          style={{ width: "100%", minHeight: 120, padding: "8px 10px", border: "1px solid #FDE68A", borderRadius: 6, fontSize: 13, color: "#000", resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "white" }}
        />
      </div>

      {/* Closing footer */}
      <div style={{ background: "#1E3A8A", borderRadius: 10, padding: "28px 32px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <img src="/logo-si.svg" alt="Simpla Invest" style={{ height: 32, width: 32, objectFit: "contain" }} />
          <span style={{ fontSize: 16, fontWeight: 700 }}>Simpla Invest</span>
        </div>
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#BFDBFE", lineHeight: 1.6 }}>
          Esta estratégia foi elaborada exclusivamente para <strong style={{ color: "white" }}>{clientName}</strong> em {data}.
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#BFDBFE", lineHeight: 1.6 }}>
          Válida por 12 meses. Recomendamos revisão anual ou sempre que houver mudanças
          significativas na sua situação financeira.
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "#93C5FD" }}>
          Dúvidas? Entre em contato com seu consultor Simpla Invest.
        </p>
      </div>
    </div>
  );
}
