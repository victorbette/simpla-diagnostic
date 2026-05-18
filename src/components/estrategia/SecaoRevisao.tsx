import { FileText, FileDown } from "lucide-react";
import type { SectionStatus, SecaoId } from "./EstrategiaInicialPage";

interface Props {
  statusSecoes: Record<SecaoId, SectionStatus>;
  comentarios: Record<string, string>;
  onNavigate: (s: SecaoId) => void;
  onPrint: (type: "consultor" | "cliente") => void;
}

const SECOES_REVISAO: { id: SecaoId; label: string; color: string }[] = [
  { id: "capa", label: "Capa e Identificação", color: "#BBA866" },
  { id: "assetAllocation", label: "Asset Allocation", color: "#7C3AED" },
  { id: "aposentadoria", label: "Aposentadoria / IF", color: "#22C55E" },
  { id: "protecaoSucessorio", label: "Proteção e Sucessório", color: "#F87171" },
  { id: "fiscal", label: "Planejamento Fiscal", color: "#F59E0B" },
  { id: "proximosPassos", label: "Próximos Passos", color: "#3B82F6" },
];

export function SecaoRevisao({ statusSecoes, comentarios, onNavigate, onPrint }: Props) {
  const pendentes = SECOES_REVISAO.filter((s) => statusSecoes[s.id] !== "concluido").length;
  const todasConcluidas = pendentes === 0;

  return (
    <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Banner */}
      <div style={{
        padding: "16px 20px", borderRadius: 10,
        backgroundColor: todasConcluidas ? "#F0FDF4" : "#FFFBEB",
        border: `1px solid ${todasConcluidas ? "#86EFAC" : "#FDE68A"}`,
        fontSize: 14, fontWeight: 600,
        color: todasConcluidas ? "#16A34A" : "#B45309",
      }}>
        {todasConcluidas
          ? "✓ Estratégia completa — pronta para geração"
          : `⚠ ${pendentes} seção${pendentes > 1 ? "ões" : ""} pendente${pendentes > 1 ? "s" : ""} — revise antes de gerar`
        }
      </div>

      {/* Grid de revisão */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {SECOES_REVISAO.map((secao) => {
          const status = statusSecoes[secao.id];
          const isPendente = status !== "concluido";
          const preview = comentarios[secao.id] ?? "";
          return (
            <div
              key={secao.id}
              onClick={() => onNavigate(secao.id)}
              style={{
                backgroundColor: isPendente ? "#FFFBEB" : "white",
                border: isPendente ? "1.5px dashed #FDE68A" : "1.5px solid #DCFCE7",
                borderRadius: 10, padding: "14px 16px",
                cursor: "pointer", transition: "box-shadow 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: secao.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#041A20" }}>{secao.label}</span>
                </div>
                {status === "concluido" ? (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999, backgroundColor: "#F0FDF4", color: "#16A34A" }}>✓ Concluída</span>
                ) : status === "revisando" ? (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 999, backgroundColor: "#FFFBEB", color: "#B45309" }}>Em revisão</span>
                ) : (
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, backgroundColor: "#F3F4F6", color: "#6B7280" }}>Pendente</span>
                )}
              </div>
              {preview ? (
                <p style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {preview.slice(0, 80)}{preview.length > 80 ? "…" : ""}
                </p>
              ) : (
                <p style={{ fontSize: 12, color: "#D1D5DB", fontStyle: "italic", margin: 0 }}>Sem estratégia redigida</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Gerar documento */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: "3px solid #041A20" }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#041A20", margin: "0 0 4px" }}>Documento pronto para geração</p>
        <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>Escolha o formato de entrega ao cliente</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => onPrint("consultor")}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              padding: 16, borderRadius: 8, border: "1.5px solid #041A20",
              backgroundColor: "white", cursor: "pointer",
            }}
          >
            <FileText style={{ width: 24, height: 24, color: "#041A20" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#041A20" }}>Gerar PDF Consultor</span>
            <span style={{ fontSize: 11, color: "#6B7280" }}>Versão completa com dados técnicos</span>
          </button>

          <button
            onClick={() => onPrint("cliente")}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              padding: 16, borderRadius: 8, border: "none",
              backgroundColor: "#041A20", cursor: "pointer",
            }}
          >
            <FileDown style={{ width: 24, height: 24, color: "white" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Gerar PDF Cliente</span>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>Versão simplificada para o cliente</span>
          </button>
        </div>

        {!todasConcluidas && (
          <div style={{ padding: "10px 14px", backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, fontSize: 13, color: "#B45309" }}>
            ⚠ Seções pendentes não serão incluídas no documento
          </div>
        )}
      </div>
    </div>
  );
}
