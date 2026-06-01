import { Building2, FileX, PiggyBank, Info } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface Props {
  patrimonioTotal: number;
  temEmpresa: boolean;
  maisDeUmaEmpresa: boolean;
  possuiSocios: boolean;
  filhos: Array<{ nome: string; idade?: number }>;
  score: number;
  motivos: string[];
  observacoes: string;
  onObservacoesChange: (v: string) => void;
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
  patrimonioTotal,
  temEmpresa,
  maisDeUmaEmpresa,
  possuiSocios,
  filhos,
  score,
  motivos,
  observacoes,
  onObservacoesChange,
}: Props) {
  const custoInventarioMin = patrimonioTotal * 0.08;
  const custoInventarioMax = patrimonioTotal * 0.20;
  const custoHolding = 50_000;
  const economiaMin = Math.max(0, custoInventarioMin - custoHolding);
  const economiaMax = Math.max(0, custoInventarioMax - custoHolding);
  const barColor = score > 70 ? "#15803D" : "#F59E0B";

  // Build profile badges from available data for context
  const perfis: string[] = [...motivos];
  if (temEmpresa && !perfis.some(m => m.includes("CNPJ"))) perfis.push("Possui empresa (CNPJ)");
  if (maisDeUmaEmpresa && !perfis.some(m => m.includes("uma empresa"))) perfis.push("Mais de uma empresa");
  if (possuiSocios && !perfis.some(m => m.includes("sócios"))) perfis.push("Possui sócios");
  if (filhos.length > 0 && !perfis.some(m => m.includes("herdeiros"))) perfis.push("Tem herdeiros");

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

      {/* BLOCO 3 — HOLDING × INVENTÁRIO */}
      <SubLabel text="Holding × Inventário" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
        {/* Inventário */}
        <div style={{ backgroundColor: "#FFF5F5", border: "1px solid #FEE2E2", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <FileX size={15} style={{ color: "#B91C1C", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C" }}>Inventário</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              "Duração: 2 a 10 anos",
              "Custo: 8% a 20% do patrimônio",
              "Risco de litígios familiares",
              "Bloqueio de bens durante o processo",
              "Perda de valor patrimonial",
              "Necessário para cada falecimento",
            ].map((item) => (
              <li key={item} style={{ fontSize: 12, color: "#B91C1C", display: "flex", gap: 6 }}>
                <span style={{ flexShrink: 0 }}>✗</span><span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Holding */}
        <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #DCFCE7", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Building2 size={15} style={{ color: "#15803D", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>Holding</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              "Constituída uma única vez",
              "Sucessão sem inventário",
              "Bens protegidos e governança estruturada",
              "Regras definidas em vida",
              "Abarca múltiplas gerações de herdeiros",
              "Transmissão via cotas societárias",
            ].map((item) => (
              <li key={item} style={{ fontSize: 12, color: "#15803D", display: "flex", gap: 6 }}>
                <span style={{ flexShrink: 0 }}>✓</span><span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {DIV}

      {/* BLOCO 4 — SIMULAÇÃO */}
      <SubLabel text="Simulação com Seu Patrimônio" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ backgroundColor: "#F8FAFF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px 14px" }}>
          <p style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>
            Seu Patrimônio
          </p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
            {formatCurrency(patrimonioTotal)}
          </p>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Base de cálculo</p>
        </div>

        <div style={{ backgroundColor: "#FFF5F5", border: "1px solid #FEE2E2", borderRadius: 8, padding: "12px 14px" }}>
          <p style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>
            Custo do Inventário
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#B91C1C", margin: 0 }}>
            {formatCurrency(custoInventarioMin)} a {formatCurrency(custoInventarioMax)}
          </p>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Entre 8% e 20% do patrimônio</p>
        </div>

        <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #DCFCE7", borderRadius: 8, padding: "12px 14px" }}>
          <p style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>
            Custo da Holding
          </p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#15803D", margin: 0 }}>
            ~ {formatCurrency(custoHolding)}
          </p>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Investimento inicial estimado</p>
        </div>
      </div>

      {/* Economia em destaque */}
      <div
        style={{
          backgroundColor: "#DCFCE7",
          border: "1px solid #BBF7D0",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PiggyBank size={24} style={{ color: "#15803D", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#15803D", fontWeight: 600 }}>
            Economia estimada com a Holding
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#15803D", margin: 0 }}>
            {formatCurrency(economiaMin)} a {formatCurrency(economiaMax)}
          </p>
          <p style={{ fontSize: 11, color: "#6B7280", margin: "2px 0 0" }}>vs. custo do inventário</p>
        </div>
      </div>

      {DIV}

      {/* BLOCO 5 — CONCLUSÃO */}
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

      {DIV}

      {/* BLOCO 6 — CAMPO DO CONSULTOR */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
          Observações do consultor
        </label>
        <div style={{ position: "relative" }}>
          <textarea
            value={observacoes}
            onChange={(e) => onObservacoesChange(e.target.value)}
            placeholder="Adicione recomendações específicas sobre a constituição da holding para este cliente..."
            style={{
              width: "100%",
              minHeight: 120,
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #DDD6FE",
              fontSize: 13,
              color: "#111827",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
          <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#9CA3AF" }}>
            {observacoes.length} caracteres
          </span>
        </div>
      </div>
    </div>
  );
}
