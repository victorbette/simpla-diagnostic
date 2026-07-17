import { useState } from "react";
import { calcularIF, calcularProtecao, calcularFiscal } from "@/types/financialPlanning";
import { detectarSeguroRC } from "@/lib/seguroRC";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia, ProximoPasso } from "@/types/estrategiaResultados";
import { DOC, TEXTO_CORPO } from "@/lib/documentoStyles";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  onResultadosChange: (r: ResultadosEstrategia) => void;
}

const PRIO_BADGE = {
  alta:  { color: "#B91C1C", bg: "#FEE2E2", border: "#B91C1C" },
  media: { color: "#B45309", bg: "#FEF3C7", border: "#B45309" },
  baixa: { color: "#6B7280", bg: "#F3F4F6", border: "#6B7280" },
} as const;

const AREAS = [
  "Asset Allocation",
  "Liberdade Financeira",
  "Proteção e Sucessão",
  "Planejamento Tributário",
  "Viagens e Milhas",
  "Geral",
];

function gerarPassosIniciais(plan: FinancialPlan, resultados: ResultadosEstrategia): ProximoPasso[] {
  const passos: ProximoPasso[] = [];

  const ifGap = resultados.if
    ? (resultados.if.liberdadeAlcancada ? 0 : 1)
    : calcularIF(plan.planejamentoIF).gap;
  if (ifGap > 0) {
    passos.push({ id: crypto.randomUUID(), descricao: "Aumentar aporte mensal para atingir a liberdade financeira na data planejada", prioridade: "alta", dataPrevisao: "", area: "Liberdade Financeira" });
  }

  const seguroGap = resultados.seguro?.gap ?? calcularProtecao(plan.protecao).gap;
  if (seguroGap > 0) {
    passos.push({ id: crypto.randomUUID(), descricao: "Contratar seguro de vida para cobrir o gap de proteção identificado", prioridade: "alta", dataPrevisao: "", area: "Proteção e Sucessão" });
  }

  const fiscalEspaco = resultados.fiscal?.espacoDisponivelMensal ?? (calcularFiscal(plan.fiscal).espacoPGBL / 12);
  if (fiscalEspaco > 0 && plan.fiscal.tipoDeclaracao === "completa") {
    passos.push({ id: crypto.randomUUID(), descricao: "Abrir ou aumentar contribuição PGBL para aproveitar benefício fiscal", prioridade: "media", dataPrevisao: "", area: "Planejamento Tributário" });
  }

  const profissao = plan?.dadosCliente?.profissao ?? "";
  const infoRC = detectarSeguroRC(profissao);
  if (infoRC.recomendado) {
    passos.push({
      id: crypto.randomUUID(),
      descricao: `Analisar necessidade de Seguro de Responsabilidade Civil Profissional — ${profissao} tem exposição a processos por erros profissionais`,
      prioridade: "media" as const,
      dataPrevisao: "",
      area: "Proteção e Sucessão",
    });
  }

  if (!plan.sucessorio.possuiTestamento && plan.sucessorio.patrimonioTotal > 500_000) {
    passos.push({ id: crypto.randomUUID(), descricao: "Elaborar testamento para planejamento sucessório", prioridade: "media", dataPrevisao: "", area: "Proteção e Sucessão" });
  }

  const gastoCartao = Number(plan?.dadosCliente?.gastoCartaoMensal) || 0;
  if (gastoCartao >= 25000) {
    passos.push({
      id: crypto.randomUUID(),
      descricao: `Agendar reunião para apresentar programa de gestão de milhas aéreas — gasto familiar de ${gastoCartao.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}/mês no cartão`,
      prioridade: "media" as const,
      dataPrevisao: "",
      area: "Viagens e Milhas",
    });
  }

  passos.push({ id: crypto.randomUUID(), descricao: "Agendar próxima reunião de revisão da estratégia", prioridade: "baixa", dataPrevisao: "", area: "Geral" });

  return passos;
}

function PassoCard({ passo, onChange, onRemove }: { passo: ProximoPasso; onChange: (u: ProximoPasso) => void; onRemove: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [trashHovered, setTrashHovered] = useState(false);
  const pb = PRIO_BADGE[passo.prioridade];

  return (
    <div
      className="doc-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTrashHovered(false); }}
      style={{ position: "relative", background: "white", borderRadius: 8, border: `0.5px solid #E5E7EB`, borderLeft: `4px solid ${pb.border}`, padding: "14px 18px", marginBottom: 10, boxSizing: "border-box" }}
    >
      {hovered && (
        <button
          className="no-print"
          onClick={onRemove}
          onMouseEnter={() => setTrashHovered(true)}
          onMouseLeave={() => setTrashHovered(false)}
          style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: trashHovered ? "#B91C1C" : "#9CA3AF", padding: 3, lineHeight: 1 }}
        >
          <i className="ti ti-trash" style={{ fontSize: 14 }} />
        </button>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <input
            type="text"
            value={passo.descricao}
            placeholder="Descreva o próximo passo..."
            onChange={(e) => onChange({ ...passo, descricao: e.target.value })}
            style={{ width: "100%", border: "none", borderBottom: "1px solid #E5E7EB", fontSize: 13, color: "#111827", padding: "3px 0", paddingRight: hovered ? 24 : 0, outline: "none", background: "transparent", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <select
            value={passo.area}
            onChange={(e) => onChange({ ...passo, area: e.target.value })}
            style={{ marginTop: 5, fontSize: 11, color: "#6B7280", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", outline: "none" }}
          >
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            {!AREAS.includes(passo.area) && <option value={passo.area}>{passo.area}</option>}
          </select>
        </div>

        <div style={{ position: "relative", flexShrink: 0 }}>
          <select
            value={passo.prioridade}
            onChange={(e) => onChange({ ...passo, prioridade: e.target.value as ProximoPasso["prioridade"] })}
            style={{ appearance: "none", WebkitAppearance: "none", padding: "3px 20px 3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500, background: pb.bg, color: pb.color, border: "none", cursor: "pointer", fontFamily: "inherit", outline: "none" }}
          >
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
          <i className="ti ti-chevron-down" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: pb.color, pointerEvents: "none" }} />
        </div>

        <div style={{ flexShrink: 0 }}>
          <p style={{ margin: "0 0 2px", fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>Previsão</p>
          <input
            type="month"
            value={passo.dataPrevisao}
            onChange={(e) => onChange({ ...passo, dataPrevisao: e.target.value })}
            style={{ fontSize: 12, color: "#374151", border: "1px solid #E5E7EB", borderRadius: 5, padding: "3px 7px", fontFamily: "inherit", outline: "none", background: "white" }}
          />
        </div>
      </div>
    </div>
  );
}

/** Página "Plano de Ação" — cronograma de implementação editável (v4 p.17) */
export function DocPlanoAcao({ nomeCliente, plan, resultados, onResultadosChange }: Props) {
  const [passos, setPassos] = useState<ProximoPasso[]>(() => {
    const saved = resultados.proximosPassos;
    if (saved && saved.length > 0) return saved;
    return gerarPassosIniciais(plan, resultados);
  });

  const updatePassos = (next: ProximoPasso[]) => {
    setPassos(next);
    onResultadosChange({ ...resultados, proximosPassos: next });
  };

  const handleAdd = () => {
    updatePassos([...passos, { id: crypto.randomUUID(), descricao: "", prioridade: "media", dataPrevisao: "", area: "Geral" }]);
  };

  return (
    <PaginaDoc rodape={<RodapePagina nomeCliente={nomeCliente} />}>
      <HeaderSecao titulo="Plano de Ação" />

      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
        Um planejamento financeiro de excelência só gera valor real quando aliado a uma execução
        disciplinada, técnica e diligente. A transição da estratégia para a prática é o momento
        mais crítico da sua jornada de construção e proteção patrimonial.
      </p>

      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 18 }}>
        Para que a estratégia desenhada saia do papel e se traduza em resultados tangíveis,
        estruturamos um cronograma de implementação claro, listando as ações recomendadas em ordem
        de prioridade. Essa organização metodológica garante que nosso foco inicial esteja voltado
        para a mitigação de riscos imediatos e para a captura das oportunidades de maior impacto no
        seu patrimônio.
      </p>

      {/* Lista */}
      <div style={{ marginBottom: 12 }}>
        {passos.map((passo) => (
          <PassoCard
            key={passo.id}
            passo={passo}
            onChange={(updated) => updatePassos(passos.map((p) => (p.id === passo.id ? updated : p)))}
            onRemove={() => updatePassos(passos.filter((p) => p.id !== passo.id))}
          />
        ))}
        {passos.length === 0 && (
          <p style={{ textAlign: "center", color: DOC.hint, fontSize: 12, padding: "28px 0", fontStyle: "italic" }}>
            Nenhum próximo passo adicionado. Clique em "Adicionar" abaixo.
          </p>
        )}
      </div>

      {/* Add — só na tela */}
      <AddButton onClick={handleAdd} />
    </PaginaDoc>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      className="no-print"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: "100%", border: "1.5px dashed #BFDBFE", borderRadius: 8, padding: "12px", textAlign: "center", color: "#2563EB", fontSize: 12, background: hovered ? "#EFF6FF" : "white", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
    >
      <i className="ti ti-plus" style={{ fontSize: 13 }} />
      Adicionar próximo passo
    </button>
  );
}
