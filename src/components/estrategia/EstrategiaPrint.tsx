import type { EstrategiaInicial } from "@/types/estrategiaInicial";
import type { FinancialPlan } from "@/types/financialPlanning";
import logoSimpla from "@/assets/logo-simpla.svg";

interface PrintProps {
  estrategia: EstrategiaInicial;
  financialPlan: FinancialPlan | null;
  clientName: string;
}

interface AcaoItem {
  id: string;
  area: string;
  descricao: string;
  prazo: string;
  urgencia: "alta" | "media" | "baixa";
}

const SECAO_ORDER = [
  "assetAllocation",
  "aposentadoria",
  "protecao",
  "fiscal",
  "sucessorio",
  "proximosPassos",
] as const;

type SecaoKey = (typeof SECAO_ORDER)[number];

const SECAO_LABELS: Record<SecaoKey, string> = {
  assetAllocation: "Asset Allocation",
  aposentadoria: "Aposentadoria / IF",
  protecao: "Proteção",
  fiscal: "Planejamento Fiscal",
  sucessorio: "Planejamento Sucessório",
  proximosPassos: "Próximos Passos",
};

function formatDateBR(iso?: string): string {
  if (!iso) return new Date().toLocaleDateString("pt-BR");
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ─── Assessor version ─────────────────────────────────────────────────────────

export function EstrategiaPrintAssessor({
  estrategia,
  financialPlan: _financialPlan,
  clientName,
}: PrintProps) {
  const logoSrc = estrategia.logoBase64 ?? logoSimpla;
  const acoes = (estrategia.secoes.proximosPassos.dados.acoes as AcaoItem[] | undefined) ?? [];

  return (
    <div className="hidden print:block print-assessor">
      {/* Capa */}
      <div
        style={{
          pageBreakAfter: "always",
          textAlign: "center",
          padding: "60px 40px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <img
          src={logoSrc}
          alt="Logo"
          style={{ maxHeight: 80, maxWidth: 200, marginBottom: 40 }}
        />
        <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 12 }}>
          Estratégia Inicial
        </h1>
        <h2 style={{ fontSize: 20, fontWeight: "normal", marginBottom: 8, color: "#555" }}>
          {clientName}
        </h2>
        {estrategia.nomeAssessor && (
          <p style={{ fontSize: 16, color: "#666", marginBottom: 8 }}>
            Assessor: {estrategia.nomeAssessor}
          </p>
        )}
        <p style={{ fontSize: 14, color: "#888" }}>{formatDateBR(estrategia.createdAt)}</p>

        {estrategia.apresentacao && (
          <div
            style={{
              marginTop: 40,
              textAlign: "left",
              fontSize: 14,
              lineHeight: 1.7,
              color: "#444",
              borderTop: "1px solid #ddd",
              paddingTop: 24,
            }}
          >
            <p>{estrategia.apresentacao}</p>
          </div>
        )}
      </div>

      {/* Sumário */}
      <div
        style={{
          pageBreakAfter: "always",
          padding: "40px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>Sumário</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {SECAO_ORDER.map((key) => {
            const s = estrategia.secoes[key];
            return (
              <li
                key={key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #eee",
                  fontSize: 14,
                }}
              >
                <span>{SECAO_LABELS[key]}</span>
                <span style={{ color: s.completa ? "#16a34a" : "#dc2626" }}>
                  {s.completa ? "✓ Completo" : "○ Pendente"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Seções */}
      {SECAO_ORDER.map((key) => {
        const s = estrategia.secoes[key];
        return (
          <div
            key={key}
            style={{
              pageBreakAfter: "always",
              padding: "40px",
              fontFamily: "Arial, sans-serif",
            }}
          >
            <h2
              style={{
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 16,
                borderBottom: "2px solid #3b82f6",
                paddingBottom: 8,
              }}
            >
              {SECAO_LABELS[key]}
            </h2>
            {s.conteudoAssessor ? (
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "#333",
                  whiteSpace: "pre-wrap",
                }}
              >
                {s.conteudoAssessor}
              </p>
            ) : (
              <p style={{ fontSize: 14, color: "#888", fontStyle: "italic" }}>
                Conteúdo não preenchido.
              </p>
            )}
          </div>
        );
      })}

      {/* Próximos passos — ações detalhadas */}
      {acoes.length > 0 && (
        <div
          style={{
            pageBreakAfter: "always",
            padding: "40px",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <h2
            style={{
              fontSize: 20,
              fontWeight: "bold",
              marginBottom: 16,
              borderBottom: "2px solid #3b82f6",
              paddingBottom: 8,
            }}
          >
            Ações — Detalhamento
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6" }}>
                <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd" }}>Área</th>
                <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd" }}>Ação</th>
                <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd" }}>Prazo</th>
                <th style={{ padding: "8px", textAlign: "left", border: "1px solid #ddd" }}>Urgência</th>
              </tr>
            </thead>
            <tbody>
              {acoes.map((a) => (
                <tr key={a.id}>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{a.area}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{a.descricao}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {a.prazo
                      ? new Date(a.prazo).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {a.urgencia === "alta"
                      ? "Alta"
                      : a.urgencia === "media"
                      ? "Média"
                      : "Baixa"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          padding: "20px 40px",
          fontFamily: "Arial, sans-serif",
          fontSize: 11,
          color: "#888",
          textAlign: "center",
          borderTop: "1px solid #eee",
        }}
      >
        Confidencial — uso restrito ao assessor
      </div>
    </div>
  );
}

// ─── Cliente version ──────────────────────────────────────────────────────────

export function EstrategiaPrintCliente({
  estrategia,
  financialPlan: _financialPlan,
  clientName,
}: PrintProps) {
  const logoSrc = estrategia.logoBase64 ?? logoSimpla;

  return (
    <div className="hidden print:block print-cliente">
      {/* Capa */}
      <div
        style={{
          pageBreakAfter: "always",
          textAlign: "center",
          padding: "60px 40px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <img
          src={logoSrc}
          alt="Logo"
          style={{ maxHeight: 80, maxWidth: 200, marginBottom: 40 }}
        />
        <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 12 }}>
          Estratégia Inicial
        </h1>
        <h2 style={{ fontSize: 20, fontWeight: "normal", marginBottom: 8, color: "#555" }}>
          {clientName}
        </h2>
        {estrategia.nomeAssessor && (
          <p style={{ fontSize: 16, color: "#666", marginBottom: 8 }}>
            Assessor: {estrategia.nomeAssessor}
          </p>
        )}
        <p style={{ fontSize: 14, color: "#888" }}>{formatDateBR(estrategia.createdAt)}</p>

        {estrategia.apresentacao && (
          <div
            style={{
              marginTop: 40,
              textAlign: "left",
              fontSize: 14,
              lineHeight: 1.7,
              color: "#444",
              borderTop: "1px solid #ddd",
              paddingTop: 24,
            }}
          >
            <p>{estrategia.apresentacao}</p>
          </div>
        )}
      </div>

      {/* Seções — apenas conteúdo assessor */}
      {SECAO_ORDER.map((key) => {
        const s = estrategia.secoes[key];
        if (!s.conteudoAssessor) return null;
        return (
          <div
            key={key}
            style={{
              pageBreakAfter: "always",
              padding: "40px",
              fontFamily: "Arial, sans-serif",
            }}
          >
            <h2
              style={{
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 16,
                borderBottom: "2px solid #3b82f6",
                paddingBottom: 8,
              }}
            >
              {SECAO_LABELS[key]}
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "#333",
                whiteSpace: "pre-wrap",
              }}
            >
              {s.conteudoAssessor}
            </p>
          </div>
        );
      })}

      {/* Footer */}
      <div
        style={{
          padding: "20px 40px",
          fontFamily: "Arial, sans-serif",
          fontSize: 11,
          color: "#888",
          textAlign: "center",
          borderTop: "1px solid #eee",
        }}
      >
        Documento preparado pelo seu assessor financeiro
      </div>
    </div>
  );
}
