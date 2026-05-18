import { useRef } from "react";
import { Image } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  calcularIF,
  PERFIL_LABELS,
} from "@/types/financialPlanning";
import type { FinancialPlan, PerfilRisco } from "@/types/financialPlanning";

interface Props {
  plan: FinancialPlan;
  clientName: string;
  logoBase64: string | null;
  onLogoChange: (v: string | null) => void;
  nomeConsultor: string;
  onNomeConsultorChange: (v: string) => void;
  apresentacao: string;
  onApresentacaoChange: (v: string) => void;
}

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

export function SecaoCapa({
  plan,
  clientName,
  logoBase64,
  onLogoChange,
  nomeConsultor,
  onNomeConsultorChange,
  apresentacao,
  onApresentacaoChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onLogoChange(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  const perfil = plan.dadosCliente.suitabilityPerfil ?? plan.suitability?.perfil ?? null;
  const perfilLabel = perfil ? PERFIL_LABELS[perfil as PerfilRisco] : "Não definido";
  const ifResult = calcularIF(plan.planejamentoIF);
  const score = Math.round(ifResult.percentualIF);
  const patrimonio = plan.dadosCliente.patrimonioFinanceiroEstimado ?? plan.ativosAtuais.total ?? 0;
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const perfilColor =
    perfil === "moderado" || perfil === "conservador_moderado"
      ? { bg: "#FFFBEB", color: "#B45309" }
      : perfil === "arrojado"
      ? { bg: "#FEF2F2", color: "#DC2626" }
      : { bg: "#F0FDFA", color: "#0F766E" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Card esquerdo */}
      <div style={{ ...CARD, borderTop: "3px solid #BBA866" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 20px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Identidade do Documento
        </p>

        {/* Logo upload */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 6 }}>Logo</label>
          {logoBase64 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={logoBase64} alt="Logo" style={{ height: 48, objectFit: "contain", borderRadius: 6, border: "1px solid #E5E7EB", padding: 4 }} />
              <button
                onClick={() => onLogoChange(null)}
                style={{ fontSize: 12, color: "#DC2626", background: "none", border: "none", cursor: "pointer" }}
              >
                Remover
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: "2px dashed #E5E7EB", borderRadius: 8, padding: "20px 0",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                cursor: "pointer", color: "#9CA3AF",
              }}
            >
              <Image style={{ width: 24, height: 24 }} />
              <span style={{ fontSize: 12 }}>Carregar logo da Simpla</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*,.svg" style={{ display: "none" }} onChange={handleFile} />
        </div>

        {/* Nome do consultor */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 6 }}>
            Nome do consultor responsável
          </label>
          <input
            type="text"
            value={nomeConsultor}
            onChange={(e) => onNomeConsultorChange(e.target.value)}
            placeholder="Ex: João da Silva"
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #E5E7EB",
              fontSize: 13, color: "#041A20", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Apresentação */}
        <div>
          <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 6 }}>
            Apresentação personalizada
          </label>
          <textarea
            value={apresentacao}
            onChange={(e) => onApresentacaoChange(e.target.value)}
            placeholder="Ex: É com satisfação que apresentamos seu planejamento financeiro personalizado..."
            style={{
              width: "100%", minHeight: 120, padding: "10px 12px", borderRadius: 6,
              border: "1px solid #E5E7EB", fontSize: 13, color: "#041A20",
              resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* Card direito */}
      <div style={{ ...CARD, borderTop: "3px solid #041A20" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 20px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Resumo do Cliente
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 6px", textTransform: "uppercase", fontWeight: 600 }}>Perfil de Risco</p>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, backgroundColor: perfilColor.bg, color: perfilColor.color }}>
              ● {perfilLabel}
            </span>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 6px", textTransform: "uppercase", fontWeight: 600 }}>Score Geral</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#041A20", margin: 0 }}>{score}<span style={{ fontSize: 14, color: "#6B7280" }}>/100</span></p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Patrimônio Financeiro</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#0F766E", margin: 0 }}>{formatCurrency(patrimonio)}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Data de Elaboração</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#041A20", margin: 0 }}>{hoje}</p>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 10px" }}>Áreas do planejamento</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              { label: "Asset Alloc.", color: "#7C3AED", bg: "#F5F3FF" },
              { label: "Aposentadoria", color: "#22C55E", bg: "#F0FDF4" },
              { label: "Proteção", color: "#F87171", bg: "#FEF2F2" },
              { label: "Fiscal", color: "#F59E0B", bg: "#FFFBEB" },
              { label: "Sucessório", color: "#3B82F6", bg: "#EFF6FF" },
            ].map(({ label, color, bg }) => (
              <span key={label} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, backgroundColor: bg, color }}>
                {label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16, padding: "12px 14px", backgroundColor: "#F8F9FA", borderRadius: 8, fontSize: 13, color: "#374151" }}>
          <strong style={{ color: "#041A20" }}>{clientName}</strong> · {perfilLabel}
        </div>
      </div>
    </div>
  );
}
