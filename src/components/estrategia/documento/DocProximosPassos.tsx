import { useState } from "react";
import { calcularIF, calcularProtecao, calcularFiscal } from "@/types/financialPlanning";
import { calcularPerfilHolding } from "@/lib/holding";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia, ProximoPasso } from "@/types/estrategiaResultados";
import { DOC, TEXTO_CORPO, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import { PAG, TOTAL_PAGINAS } from "@/lib/documentoPaginas";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  onResultadosChange: (r: ResultadosEstrategia) => void;
}

const PRIO_META = {
  alta:  { label: "Alta",  color: DOC.vermelho, bg: DOC.vermelhoBg },
  media: { label: "Média", color: DOC.ambar,    bg: DOC.ambarBg },
  baixa: { label: "Baixa", color: DOC.muted,    bg: DOC.linhaSoft },
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
    passos.push({ id: crypto.randomUUID(), descricao: "Aumentar aporte mensal para atingir a liberdade financeira na data planejada", prioridade: "alta", dataPrevisao: "", area: "Liberdade Financeira" });
  }

  const seguroGap = resultados.seguro?.gap ?? calcularProtecao(plan.protecao).gap;
  if (seguroGap > 0) {
    passos.push({ id: crypto.randomUUID(), descricao: "Contratar seguro de vida para cobrir o gap de proteção identificado", prioridade: "alta", dataPrevisao: "", area: "Proteção e Sucessório" });
  }

  const fiscalEspaco = resultados.fiscal?.espacoDisponivelMensal ?? (calcularFiscal(plan.fiscal).espacoPGBL / 12);
  if (fiscalEspaco > 0 && plan.fiscal.tipoDeclaracao === "completa") {
    passos.push({ id: crypto.randomUUID(), descricao: "Abrir ou aumentar contribuição PGBL para aproveitar benefício fiscal", prioridade: "media", dataPrevisao: "", area: "Planejamento Fiscal" });
  }

  const holding = calcularPerfilHolding({ ...plan.dadosCliente, temEmpresa: plan.fiscal.temEmpresa }, plan.sucessorio);
  if (holding.recomendada && !plan.sucessorio.possuiHolding) {
    passos.push({ id: crypto.randomUUID(), descricao: "Avaliar constituição de holding patrimonial com assessoria jurídica especializada", prioridade: "alta", dataPrevisao: "", area: "Proteção e Sucessório" });
  }

  if (!plan.sucessorio.possuiTestamento && plan.sucessorio.patrimonioTotal > 500_000) {
    passos.push({ id: crypto.randomUUID(), descricao: "Elaborar testamento para planejamento sucessório", prioridade: "media", dataPrevisao: "", area: "Proteção e Sucessório" });
  }

  passos.push({ id: crypto.randomUUID(), descricao: "Agendar próxima reunião de revisão da estratégia", prioridade: "baixa", dataPrevisao: "", area: "Geral" });

  return passos;
}

/* ── Card editável (tela) ─────────────────────────────────── */
function PassoCard({ passo, onChange, onRemove }: { passo: ProximoPasso; onChange: (u: ProximoPasso) => void; onRemove: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [trashHovered, setTrashHovered] = useState(false);
  const pb = PRIO_META[passo.prioridade];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTrashHovered(false); }}
      style={{ position: "relative", background: "white", borderRadius: 8, border: `1px solid ${DOC.linha}`, borderLeft: `4px solid ${pb.color}`, padding: "13px 18px", marginBottom: 9, boxSizing: "border-box" }}
    >
      {hovered && (
        <button
          onClick={onRemove}
          onMouseEnter={() => setTrashHovered(true)}
          onMouseLeave={() => setTrashHovered(false)}
          style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: trashHovered ? DOC.vermelho : DOC.hint, padding: 3, lineHeight: 1 }}
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
            style={{ width: "100%", border: "none", borderBottom: `1px solid ${DOC.linha}`, fontSize: 13, color: DOC.ink, padding: "3px 0", paddingRight: hovered ? 24 : 0, outline: "none", background: "transparent", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <select
            value={passo.area}
            onChange={(e) => onChange({ ...passo, area: e.target.value })}
            style={{ marginTop: 5, fontSize: 11, color: DOC.muted, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", outline: "none" }}
          >
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
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
          <p style={{ margin: "0 0 2px", fontSize: 9, color: DOC.hint, textTransform: "uppercase", letterSpacing: "0.05em" }}>Previsão</p>
          <input
            type="month"
            value={passo.dataPrevisao}
            onChange={(e) => onChange({ ...passo, dataPrevisao: e.target.value })}
            style={{ fontSize: 12, color: DOC.texto, border: `1px solid ${DOC.linha}`, borderRadius: 5, padding: "3px 7px", fontFamily: "inherit", outline: "none", background: "white" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Linha estática (impressão) ───────────────────────────── */
function PassoPrint({ passo, numero }: { passo: ProximoPasso; numero: number }) {
  const pb = PRIO_META[passo.prioridade];
  return (
    <div
      className="doc-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "white",
        borderRadius: 8,
        border: `1px solid ${DOC.linha}`,
        borderLeft: `4px solid ${pb.color}`,
        padding: "11px 16px",
        marginBottom: 8,
      }}
    >
      <span style={{ flex: 1, fontSize: 12.5, color: DOC.ink, fontWeight: 500 }}>
        {numero}. {passo.descricao}
      </span>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          padding: "3px 10px",
          borderRadius: 999,
          background: pb.bg,
          color: pb.color,
          flexShrink: 0,
        }}
      >
        {pb.label}
      </span>
      <span style={{ fontSize: 11, color: DOC.hint, flexShrink: 0, minWidth: 108, textAlign: "right" }}>
        {passo.area}
      </span>
    </div>
  );
}

/* ── Linha do tempo 30/60/90 ──────────────────────────────── */
function resumo(passos: ProximoPasso[], fallback: string): string {
  const descricoes = passos.map((p) => p.descricao.trim()).filter(Boolean);
  if (descricoes.length === 0) return fallback;
  const texto = descricoes.slice(0, 2).join(" · ");
  return texto.length > 110 ? `${texto.slice(0, 107)}...` : texto;
}

function LinhaDoTempo({ passos }: { passos: ProximoPasso[] }) {
  const altas = passos.filter((p) => p.prioridade === "alta");
  const medias = passos.filter((p) => p.prioridade === "media");
  const baixas = passos.filter((p) => p.prioridade === "baixa");

  const etapas = [
    { dias: 30, texto: resumo(altas, "Iniciar as ações de maior prioridade") },
    { dias: 60, texto: resumo(medias, "Avançar nas ações recomendadas") },
    { dias: 90, texto: resumo(baixas.length > 0 ? baixas : medias.slice(2), "Revisar a estratégia com o consultor") },
  ];

  return (
    <div style={{ marginTop: 18 }}>
      <p style={{ margin: "0 0 12px", fontSize: 14.5, fontWeight: 700, color: DOC.ink }}>
        Linha do Tempo
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {etapas.map((etapa) => (
          <div
            key={etapa.dias}
            className="doc-card"
            style={{
              background: "white",
              border: `1px solid ${DOC.linha}`,
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: DOC.navyInk,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12.5,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              {etapa.dias}
            </div>
            <p style={{ margin: "0 0 5px", fontSize: 12.5, fontWeight: 700, color: DOC.navyInk }}>
              {etapa.dias} dias
            </p>
            <p style={{ ...TEXTO_CORPO, fontSize: 11, lineHeight: 1.6 }}>{etapa.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocProximosPassos({ nomeCliente, plan, resultados, onResultadosChange }: Props) {
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

  const preenchidos = passos.filter((p) => p.descricao.trim().length > 0);
  const imediatas = preenchidos.filter((p) => p.prioridade === "alta");
  const recomendadas = preenchidos.filter((p) => p.prioridade !== "alta");

  return (
    <PaginaDoc
      rodape={<RodapePagina nomeCliente={nomeCliente} numPagina={PAG.proximosPassos} totalPaginas={TOTAL_PAGINAS} />}
    >
      <HeaderSecao titulo="Próximos Passos" />

      <p style={{ ...TEXTO_CORPO, marginBottom: 18 }}>
        Para que sua estratégia saia do papel, listamos abaixo as ações recomendadas em ordem de
        prioridade. Nosso time estará ao seu lado em cada etapa.
      </p>

      {/* Tela: cards editáveis */}
      <div className="doc-screen-only">
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
            <p style={{ textAlign: "center", color: DOC.hint, fontSize: 12, padding: "24px 0", fontStyle: "italic" }}>
              Nenhum próximo passo adicionado. Clique em "Adicionar" abaixo.
            </p>
          )}
        </div>
        <AddButton onClick={handleAdd} />
      </div>

      {/* Impressão: lista estática agrupada */}
      <div className="doc-print-only">
        {imediatas.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={LABEL_SUBSECAO(DOC.vermelho)}>Ações Imediatas</p>
            {imediatas.map((p, i) => (
              <PassoPrint key={p.id} passo={p} numero={i + 1} />
            ))}
          </div>
        )}
        {recomendadas.length > 0 && (
          <div>
            <p style={LABEL_SUBSECAO(DOC.ambar)}>Ações Recomendadas</p>
            {recomendadas.map((p, i) => (
              <PassoPrint key={p.id} passo={p} numero={imediatas.length + i + 1} />
            ))}
          </div>
        )}
      </div>

      <LinhaDoTempo passos={preenchidos} />
    </PaginaDoc>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: "100%", border: `1.5px dashed ${DOC.blueBorder}`, borderRadius: 8, padding: "11px", textAlign: "center", color: DOC.blue, fontSize: 12, background: hovered ? DOC.blueSoft : "white", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
    >
      <i className="ti ti-plus" style={{ fontSize: 13 }} />
      Adicionar próximo passo
    </button>
  );
}
