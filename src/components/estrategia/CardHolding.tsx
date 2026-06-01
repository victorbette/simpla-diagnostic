import { Building2, Info } from "lucide-react";

interface Props {
  temEmpresa: boolean;
  maisDeUmaEmpresa: boolean;
  possuiSocios: boolean;
  filhos: Array<{ nome: string; idade?: number }>;
  quantidadeImoveis: number;
  score: number;
  motivos: string[];
}

const DIV = (
  <div style={{ height: 1, backgroundColor: "#E5E7EB", margin: "20px 0" }} />
);

function SubLabel({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>
      {text}
    </p>
  );
}

export function CardHolding({
  temEmpresa,
  maisDeUmaEmpresa,
  possuiSocios,
  filhos,
  quantidadeImoveis,
  score,
  motivos,
}: Props) {
  const barColor = score > 70 ? "#15803D" : "#F59E0B";

  // Build profile badges from available data for context
  const perfis: string[] = [...motivos];
  if (temEmpresa && !perfis.some(m => m.includes("CNPJ"))) perfis.push("Possui empresa (CNPJ)");
  if (maisDeUmaEmpresa && !perfis.some(m => m.includes("uma empresa"))) perfis.push("Mais de uma empresa");
  if (possuiSocios && !perfis.some(m => m.includes("sócios"))) perfis.push("Possui sócios");
  if (filhos.length > 0 && !perfis.some(m => m.includes("herdeiros"))) perfis.push("Tem herdeiros");
  if (quantidadeImoveis >= 2 && !perfis.some(m => m.includes("imóveis"))) {
    perfis.push(`${quantidadeImoveis} imóveis próprios`);
  }

  return (
    <div
      style={{
        backgroundColor: "white",
        borderLeft: "4px solid #7C3AED",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* BLOCO 1 — HEADER */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <Building2 size={20} style={{ color: "#7C3AED", flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
              Análise de Holding Patrimonial
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#F3E8FF", color: "#7C3AED", borderRadius: 999, padding: "2px 10px" }}>
              Perfil identificado
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#6B7280", margin: "8px 0 0", lineHeight: 1.6 }}>
            Com base no perfil do cliente, a constituição de uma holding pode trazer benefícios
            significativos de proteção patrimonial, planejamento sucessório e economia fiscal.
          </p>
        </div>
      </div>

      {/* Adequação score bar */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
          <span>Adequação ao perfil</span>
          <span style={{ fontWeight: 700, color: barColor }}>{score}%</span>
        </div>
        <div style={{ height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${score}%`, backgroundColor: barColor, borderRadius: 3 }} />
        </div>
      </div>

      {DIV}

      {/* BLOCO 2 — PERFIL DO CLIENTE */}
      <SubLabel text="Perfil do Cliente" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 4 }}>
        {perfis.map((m) => (
          <div
            key={m}
            style={{
              backgroundColor: "#DCFCE7",
              border: "1px solid #BBF7D0",
              color: "#15803D",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
            }}
          >
            <span style={{ flexShrink: 0 }}>✓</span>
            <span>{m}</span>
          </div>
        ))}
      </div>

      {DIV}

      {/* BLOCO 3 — CONCLUSÃO */}
      <div
        style={{
          backgroundColor: "#F5F3FF",
          border: "1px solid #DDD6FE",
          borderRadius: 8,
          padding: 14,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          marginBottom: 4,
        }}
      >
        <Info size={16} style={{ color: "#7C3AED", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>
          A holding não só barateia a sucessão como evita disputas familiares, bloqueio de bens
          e anos de processos judiciais. Uma solução constituída uma única vez que protege o
          patrimônio por gerações.
        </p>
      </div>

    </div>
  );
}
