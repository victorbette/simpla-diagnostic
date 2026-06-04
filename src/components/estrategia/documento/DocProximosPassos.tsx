import { useState } from "react";
import {
  calcularIF,
  calcularProtecao,
  calcularFiscal,
} from "@/types/financialPlanning";
import { calcularPerfilHolding } from "@/lib/holding";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia, ProximoPasso } from "@/types/estrategiaResultados";

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  onResultadosChange: (r: ResultadosEstrategia) => void;
}

const PRIO_BADGE = {
  alta:  { color: "#B91C1C", bg: "#FEE2E2", label: "Alta",  border: "#B91C1C" },
  media: { color: "#B45309", bg: "#FEF3C7", label: "Média", border: "#B45309" },
  baixa: { color: "#6B7280", bg: "#F3F4F6", label: "Baixa", border: "#6B7280" },
} as const;

const AREAS = [
  "Asset Allocation",
  "Liberdade Financeira",
  "Proteção e Sucessório",
  "Planejamento Fiscal",
  "Geral",
];

function gerarPassosIniciais(plan: FinancialPlan, resultados: ResultadosEstrategia): ProximoPasso[] {
  const passos: ProximoPasso[] = [];

  const ifGap = resultados.if
    ? (resultados.if.liberdadeAlcancada ? 0 : 1)
    : calcularIF(plan.planejamentoIF).gap;
  if (ifGap > 0) {
    passos.push({
      id: crypto.randomUUID(),
      descricao: "Aumentar aporte mensal para atingir a liberdade financeira na data planejada",
      prioridade: "alta",
      dataPrevisao: "",
      area: "Liberdade Financeira",
    });
  }

  const seguroGap = resultados.seguro?.gap ?? calcularProtecao(plan.protecao).gap;
  if (seguroGap > 0) {
    passos.push({
      id: crypto.randomUUID(),
      descricao: "Contratar seguro de vida para cobrir o gap de proteção identificado",
      prioridade: "alta",
      dataPrevisao: "",
      area: "Proteção e Sucessório",
    });
  }

  const fiscalEspaco = resultados.fiscal?.espacoDisponivelMensal
    ?? (calcularFiscal(plan.fiscal).espacoPGBL / 12);
  if (fiscalEspaco > 0 && plan.fiscal.tipoDeclaracao === "completa") {
    passos.push({
      id: crypto.randomUUID(),
      descricao: "Abrir ou aumentar contribuição PGBL para aproveitar benefício fiscal",
      prioridade: "media",
      dataPrevisao: "",
      area: "Planejamento Fiscal",
    });
  }

  const holding = calcularPerfilHolding(
    { ...plan.dadosCliente, temEmpresa: plan.fiscal.temEmpresa },
    plan.sucessorio,
  );
  if (holding.recomendada && !plan.sucessorio.possuiHolding) {
    passos.push({
      id: crypto.randomUUID(),
      descricao: "Avaliar constituição de holding patrimonial com assessoria jurídica especializada",
      prioridade: "alta",
      dataPrevisao: "",
      area: "Proteção e Sucessório",
    });
  }

  if (!plan.sucessorio.possuiTestamento && plan.sucessorio.patrimonioTotal > 500_000) {
    passos.push({
      id: crypto.randomUUID(),
      descricao: "Elaborar testamento para planejamento sucessório",
      prioridade: "media",
      dataPrevisao: "",
      area: "Proteção e Sucessório",
    });
  }

  passos.push({
    id: crypto.randomUUID(),
    descricao: "Agendar próxima reunião de revisão da estratégia",
    prioridade: "baixa",
    dataPrevisao: "",
    area: "Geral",
  });

  return passos;
}

function PassoCard({
  passo,
  onChange,
  onRemove,
}: {
  passo: ProximoPasso;
  onChange: (updated: ProximoPasso) => void;
  onRemove: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [trashHovered, setTrashHovered] = useState(false);
  const pb = PRIO_BADGE[passo.prioridade];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTrashHovered(false); }}
      style={{
        position: "relative",
        background: "white",
        borderRadius: 10,
        borderTop: "0.5px solid #E5E7EB",
        borderRight: "0.5px solid #E5E7EB",
        borderBottom: "0.5px solid #E5E7EB",
        borderLeft: `4px solid ${pb.border}`,
        padding: "16px 20px",
        marginBottom: 12,
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      {hovered && (
        <button
          onClick={onRemove}
          onMouseEnter={() => setTrashHovered(true)}
          onMouseLeave={() => setTrashHovered(false)}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: trashHovered ? "#B91C1C" : "#9CA3AF",
            padding: 4,
            lineHeight: 1,
          }}
        >
          <i className="ti ti-trash" style={{ fontSize: 15 }} />
        </button>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 16, alignItems: "center" }}>
        {/* Col 1: Descrição + Área */}
        <div style={{ minWidth: 0 }}>
          <input
            type="text"
            value={passo.descricao}
            placeholder="Descreva o próximo passo..."
            onChange={(e) => onChange({ ...passo, descricao: e.target.value })}
            style={{
              width: "100%",
              border: "none",
              borderBottom: "1px solid #E5E7EB",
              fontSize: 14,
              color: "#111827",
              padding: "4px 0",
              paddingRight: hovered ? 28 : 0,
              outline: "none",
              background: "transparent",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <select
            value={passo.area}
            onChange={(e) => onChange({ ...passo, area: e.target.value })}
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "#6B7280",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            {AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Col 2: Prioridade select styled as badge */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select
            value={passo.prioridade}
            onChange={(e) => onChange({ ...passo, prioridade: e.target.value as ProximoPasso["prioridade"] })}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              padding: "4px 22px 4px 12px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 500,
              background: pb.bg,
              color: pb.color,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
          <i
            className="ti ti-chevron-down"
            style={{
              position: "absolute",
              right: 7,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 10,
              color: pb.color,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Col 3: Data prevista */}
        <div style={{ flexShrink: 0 }}>
          <p style={{ margin: "0 0 3px", fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Previsão
          </p>
          <input
            type="month"
            value={passo.dataPrevisao}
            onChange={(e) => onChange({ ...passo, dataPrevisao: e.target.value })}
            style={{
              fontSize: 13,
              color: "#374151",
              border: "1px solid #E5E7EB",
              borderRadius: 6,
              padding: "4px 8px",
              fontFamily: "inherit",
              outline: "none",
              background: "white",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function DocProximosPassos({ plan, resultados, onResultadosChange }: Props) {
  const [passos, setPassos] = useState<ProximoPasso[]>(() => {
    const saved = resultados.proximosPassos;
    if (saved && saved.length > 0) return saved;
    return gerarPassosIniciais(plan, resultados);
  });

  const updatePassos = (next: ProximoPasso[]) => {
    setPassos(next);
    onResultadosChange({ ...resultados, proximosPassos: next });
  };

  const handleChange = (id: string, updated: ProximoPasso) => {
    updatePassos(passos.map((p) => (p.id === id ? updated : p)));
  };

  const handleRemove = (id: string) => {
    updatePassos(passos.filter((p) => p.id !== id));
  };

  const handleAdd = () => {
    const novo: ProximoPasso = {
      id: crypto.randomUUID(),
      descricao: "",
      prioridade: "media",
      dataPrevisao: "",
      area: "Geral",
    };
    updatePassos([...passos, novo]);
  };

  return (
    <div className="doc-page page-break-before" style={{ background: "white" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: "2px solid #1E3A8A", marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, background: "#1E3A8A", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
          <i className="ti ti-list-checks" style={{ fontSize: 22 }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1E3A8A" }}>Próximos Passos</h2>
          <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>Ações recomendadas e planejadas para o cliente</p>
        </div>
      </div>

      {/* Steps list */}
      <div style={{ marginBottom: 16 }}>
        {passos.map((passo) => (
          <PassoCard
            key={passo.id}
            passo={passo}
            onChange={(updated) => handleChange(passo.id, updated)}
            onRemove={() => handleRemove(passo.id)}
          />
        ))}
        {passos.length === 0 && (
          <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "32px 0", fontStyle: "italic" }}>
            Nenhum próximo passo adicionado. Clique em "+ Adicionar" abaixo.
          </p>
        )}
      </div>

      {/* Add button */}
      <AddButton onClick={handleAdd} />
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        border: "1.5px dashed #BFDBFE",
        borderRadius: 10,
        padding: "14px",
        textAlign: "center",
        color: "#2563EB",
        fontSize: 13,
        background: hovered ? "#EFF6FF" : "white",
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        transition: "background 0.15s",
      }}
    >
      <i className="ti ti-plus" style={{ fontSize: 14 }} />
      Adicionar próximo passo
    </button>
  );
}
