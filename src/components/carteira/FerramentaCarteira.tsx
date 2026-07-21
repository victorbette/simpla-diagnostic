import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Save } from "lucide-react";
import type { Ativo, CardId, CarteiraResultado, PlanoAcaoItem } from "@/lib/carteira/types";
import { CARD_ORDER, ALOCACAO_PADRAO } from "@/lib/carteira/types";
import { gerarPlanoAcao, formatBRL, calcularPatrimonio } from "@/lib/carteira/calculos";
import { Etapa1CarteiraAtual } from "./Etapa1CarteiraAtual";
import { Etapa2CarteiraRecomendada } from "./Etapa2CarteiraRecomendada";
import { Etapa3PlanoAcao } from "./Etapa3PlanoAcao";
import { Etapa4Resultado } from "./Etapa4Resultado";

interface Props {
  clientId: string;
  clientName: string;
  clientProfile: string | null;
  patrimonyInicial?: number;
  onClose: () => void;
  onSave?: (r: CarteiraResultado) => void;
  onLimpar?: () => void;
}

type Etapa = 1 | 2 | 3 | 4;

const ETAPAS = [
  { n: 1 as Etapa, label: "Carteira Atual" },
  { n: 2 as Etapa, label: "Recomendada" },
  { n: 3 as Etapa, label: "Plano de Ação" },
  { n: 4 as Etapa, label: "Resultado" },
];

const PERFIL_LABELS: Record<string, string> = {
  conservador: "Conservador",
  conservador_moderado: "Cons. Moderado",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

function defaultAlocacao(profile: string | null): Record<CardId, number> {
  if (profile && ALOCACAO_PADRAO[profile]) return { ...ALOCACAO_PADRAO[profile] };
  return { resgate_longo: 0, resgate_rapido: 0, acoes: 0, fiis: 0, exterior: 0, cripto: 0 };
}

interface SavedState {
  ativosAtuais: Ativo[];
  ativosRecomendados: Ativo[];
  alocacaoMeta: Record<CardId, number>;
  planoAcao: PlanoAcaoItem[];
  notasConsultor: string;
  aporteDisponivel: number;
  usdBrl?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateAtivo(a: any): Ativo {
  const VALID: CardId[] = ["resgate_rapido", "resgate_longo", "acoes", "fiis", "exterior", "cripto"];
  const card: CardId = VALID.includes(a.card) ? a.card : "resgate_rapido";
  return {
    id: String(a.id ?? Math.random()),
    card,
    nome: String(a.nome ?? ""),
    segmento: String(a.segmento ?? ""),
    vencimento: a.vencimento ? String(a.vencimento) : undefined,
    valorBRL: Number(a.valorBRL) || 0,
    quantidade: a.quantidade != null ? Number(a.quantidade) : undefined,
    cotacaoAtual: a.cotacaoAtual != null ? Number(a.cotacaoAtual) : undefined,
    adicionadoManualmente: a.adicionadoManualmente ? true : undefined,
    observacao: a.observacao ? String(a.observacao) : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateItemPlano(p: any): PlanoAcaoItem {
  const VALID: CardId[] = ["resgate_rapido", "resgate_longo", "acoes", "fiis", "exterior", "cripto"];
  const VALID_ACAO = ["manter", "aportar", "resgatar_parcial", "resgatar_total", "novo"];
  const card: CardId = VALID.includes(p.card) ? p.card : "resgate_rapido";
  // support both 'acao' (new) and 'tipo' (legacy localStorage data)
  const acaoRaw = p.acao ?? p.tipo;
  const acao: PlanoAcaoItem["acao"] = VALID_ACAO.includes(acaoRaw) ? acaoRaw : "manter";
  return {
    id: String(p.id ?? Math.random()),
    card,
    nomeAtivo: String(p.nomeAtivo ?? p.nome ?? ""),
    segmento: String(p.segmento ?? ""),
    acao,
    valorAtualBRL: Number(p.valorAtualBRL) || 0,
    valorMetaBRL: Number(p.valorMetaBRL) || 0,
    movimentacaoBRL: Number(p.movimentacaoBRL) || 0,
    movimentacaoEditada: p.movimentacaoEditada != null ? Number(p.movimentacaoEditada) : undefined,
    observacao: String(p.observacao ?? ""),
    prioridade: ["alta", "media", "baixa"].includes(p.prioridade) ? p.prioridade : "baixa",
    adicionadoManualmente: p.adicionadoManualmente ? true : undefined,
    valorResgateBRL: p.valorResgateBRL != null ? Number(p.valorResgateBRL) : undefined,
  };
}

export function FerramentaCarteira({ clientId, clientName, clientProfile, patrimonyInicial = 0, onClose, onSave, onLimpar }: Props) {
  const storageKey = `carteira_v3_${clientId}`;

  const [etapa, setEtapa] = useState<Etapa>(1);

  const [ativosAtuais, setAtivosAtuais] = useState<Ativo[]>([]);
  const [ativosRecomendados, setAtivosRecomendados] = useState<Ativo[]>([]);
  const [alocacaoMeta, setAlocacaoMeta] = useState<Record<CardId, number>>(() => defaultAlocacao(clientProfile));
  const [planoAcao, setPlanoAcao] = useState<PlanoAcaoItem[]>([]);
  const [notasConsultor, setNotasConsultor] = useState("");
  const [aporteDisponivel, setAporteDisponivel] = useState<number>(0);
  const [usdBrl, setUsdBrl] = useState<number>(5.0);
  const [alocacaoCompleta, setAlocacaoCompleta] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [temMudancas, setTemMudancas] = useState(false);
  const [salvo, setSalvo] = useState(false);

  // Load from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = JSON.parse(raw) as any;
        if (Array.isArray(parsed.ativosAtuais)) setAtivosAtuais(parsed.ativosAtuais.map(migrateAtivo));
        if (Array.isArray(parsed.ativosRecomendados)) setAtivosRecomendados(parsed.ativosRecomendados.map(migrateAtivo));
        if (parsed.alocacaoMeta && typeof parsed.alocacaoMeta === "object") setAlocacaoMeta({ ...defaultAlocacao(clientProfile), ...parsed.alocacaoMeta });
        if (Array.isArray(parsed.planoAcao)) setPlanoAcao(parsed.planoAcao.map(migrateItemPlano));
        if (typeof parsed.notasConsultor === "string") setNotasConsultor(parsed.notasConsultor);
        if (typeof parsed.aporteDisponivel === "number") setAporteDisponivel(parsed.aporteDisponivel);
        if (typeof parsed.usdBrl === "number" && parsed.usdBrl > 0) setUsdBrl(parsed.usdBrl);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track unsaved changes — skip the first fire after load
  const mudancasInitRef = useRef(false);
  useEffect(() => {
    if (!loaded) return;
    if (!mudancasInitRef.current) { mudancasInitRef.current = true; return; }
    setTemMudancas(true);
  }, [loaded, ativosAtuais, ativosRecomendados, alocacaoMeta, planoAcao, notasConsultor, aporteDisponivel, usdBrl]);

  // Recalculate USD assets when exchange rate changes
  const usdBrlInitial = useRef(true);
  useEffect(() => {
    if (usdBrlInitial.current) { usdBrlInitial.current = false; return; }
    const USD: CardId[] = ["exterior", "cripto"];
    const recalc = (list: Ativo[]) => list.map((a) => {
      if (!USD.includes(a.card)) return a;
      if (!((a.quantidade ?? 0) > 0 && (a.cotacaoAtual ?? 0) > 0)) return a;
      return { ...a, valorBRL: (a.quantidade ?? 0) * (a.cotacaoAtual ?? 0) * usdBrl };
    });
    setAtivosAtuais((prev) => recalc(prev));
    setAtivosRecomendados((prev) => recalc(prev));
  }, [usdBrl]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const patrimonio = useMemo(
    () => calcularPatrimonio(ativosAtuais) || patrimonyInicial,
    [ativosAtuais, patrimonyInicial]
  );

  const goToEtapa = useCallback((n: Etapa) => {
    if (n === 3) {
      setPlanoAcao((prev) => {
        // Only generate the plan on first entry; after that the consultant controls it
        if (prev.length > 0) return prev;
        const novoPlano = gerarPlanoAcao(ativosAtuais, ativosRecomendados, patrimonio + aporteDisponivel);
        return novoPlano.map((item) => {
          if (item.acao !== "novo") return item;
          const ativo = ativosRecomendados.find(
            (a) => a.nome.trim().toLowerCase() === item.nomeAtivo.trim().toLowerCase() && a.card === item.card
          );
          return ativo?.observacao ? { ...item, observacao: ativo.observacao } : item;
        });
      });
    }
    setEtapa(n);
  }, [ativosAtuais, ativosRecomendados, patrimonio, aporteDisponivel]);

  function handleNext() { if (etapa < 4) goToEtapa((etapa + 1) as Etapa); }
  function handleBack() { if (etapa > 1) setEtapa((etapa - 1) as Etapa); }

  function handleSalvarCarteira() {
    const resultado: CarteiraResultado = {
      patrimonio,
      ativosAtuais,
      ativosRecomendados,
      alocacaoMeta,
      planoAcao,
      aporteDisponivel,
    };
    try {
      const s: SavedState = { ativosAtuais, ativosRecomendados, alocacaoMeta, planoAcao, notasConsultor, aporteDisponivel, usdBrl };
      localStorage.setItem(storageKey, JSON.stringify(s));
    } catch { /* ignore */ }
    onSave?.(resultado);
    setTemMudancas(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  function handleLimpar() {
    if (window.confirm("Limpar todos os dados da carteira?\n\nIsso removerá também os dados de Asset Allocation da Estratégia.")) {
      setAtivosAtuais([]);
      setAtivosRecomendados([]);
      setAlocacaoMeta(defaultAlocacao(clientProfile));
      setPlanoAcao([]);
      setNotasConsultor("");
      setAporteDisponivel(0);
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
      onLimpar?.();
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", backgroundColor: "#F0F7FF" }}>

      {/* ── HEADER ── */}
      <header style={{ backgroundColor: "#1E3A8A", flexShrink: 0, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28, borderRadius: "50%",
            border: "none", cursor: "pointer", flexShrink: 0,
            backgroundColor: "rgba(255,255,255,0.1)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
        >
          <X style={{ width: 16, height: 16, color: "#93C5FD" }} />
        </button>

        <span style={{ color: "white", fontSize: 15, fontWeight: 500, flexShrink: 0 }}>Gestão de Carteira</span>
        <span style={{ color: "#93C5FD", fontSize: 13, flexShrink: 0 }}>{clientName}</span>
        {clientProfile && (
          <span style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#93C5FD", borderRadius: 999, fontSize: 11, padding: "2px 8px", flexShrink: 0 }}>
            {PERFIL_LABELS[clientProfile] ?? clientProfile}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {temMudancas && !salvo && (
          <span style={{ fontSize: 10, color: "#B45309", background: "#FEF3C7", padding: "2px 8px", borderRadius: 99, flexShrink: 0 }}>
            Mudanças não salvas
          </span>
        )}

        <button
          onClick={handleSalvarCarteira}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: salvo ? "#15803D" : temMudancas ? "#2563EB" : "rgba(255,255,255,0.12)",
            color: "white", border: "none",
            borderRadius: 8, padding: "6px 14px",
            fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0,
            transition: "background 200ms",
          }}
        >
          {salvo ? (
            <><i className="ti ti-circle-check" style={{ fontSize: 13 }} /> Salvo!</>
          ) : (
            <><i className="ti ti-device-floppy" style={{ fontSize: 13 }} /> Salvar Carteira</>
          )}
        </button>

        <button
          onClick={handleLimpar}
          style={{
            border: "1px solid rgba(255,255,255,0.2)", color: "white",
            backgroundColor: "rgba(255,255,255,0.08)", fontSize: 11,
            padding: "4px 10px", borderRadius: 6, cursor: "pointer", flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
        >
          Limpar dados
        </button>

        {patrimonio > 0 && (
          <div style={{ backgroundColor: "#2563EB", color: "white", padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
            Patrimônio {formatBRL(patrimonio)}
          </div>
        )}
      </header>

      {/* ── STEPPER ── */}
      <div style={{ flexShrink: 0, padding: "10px 20px", backgroundColor: "white", borderBottom: "1px solid #BFDBFE", overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", minWidth: "max-content", gap: 0 }}>
          {ETAPAS.map((e, i) => {
            const isCurrent = e.n === etapa;
            const isDone = e.n < etapa;
            const isPending = e.n > etapa;
            return (
              <div key={e.n} style={{ display: "flex", alignItems: "center" }}>
                <button
                  onClick={() => !isPending && goToEtapa(e.n)}
                  disabled={isPending}
                  style={{ display: "flex", alignItems: "center", gap: 6, cursor: isPending ? "default" : "pointer", background: "none", border: "none", padding: "2px 6px" }}
                >
                  <span style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0, fontSize: 12,
                    ...(isDone
                      ? { backgroundColor: "#15803D", color: "white" }
                      : isCurrent
                      ? { backgroundColor: "#2563EB", color: "white", fontWeight: 500 }
                      : { border: "1.5px solid #BFDBFE", color: "#9CA3AF" }),
                  }}>
                    {isDone ? "✓" : e.n}
                  </span>
                  <span style={{
                    fontSize: 12, whiteSpace: "nowrap",
                    ...(isDone ? { color: "#15803D" } : isCurrent ? { color: "#2563EB", fontWeight: 500 } : { color: "#9CA3AF" }),
                  }}>
                    {e.label}
                  </span>
                </button>
                {i < ETAPAS.length - 1 && (
                  <div style={{ width: 28, height: 0, margin: "0 4px", flexShrink: 0, borderTop: `1.5px ${isPending ? "dashed" : "solid"} ${isDone ? "#15803D" : "#BFDBFE"}` }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {etapa === 1 && (
          <Etapa1CarteiraAtual
            ativos={ativosAtuais}
            onAtivos={setAtivosAtuais}
            patrimonio={patrimonio}
            usdBrl={usdBrl}
            onUsdBrlChange={setUsdBrl}
          />
        )}
        {etapa === 2 && (
          <Etapa2CarteiraRecomendada
            ativos={ativosRecomendados}
            onAtivos={setAtivosRecomendados}
            ativosAtuais={ativosAtuais}
            alocacaoMeta={alocacaoMeta}
            onAlocacaoMeta={setAlocacaoMeta}
            patrimonio={patrimonio}
            clientProfile={clientProfile}
            aporteDisponivel={aporteDisponivel}
            onAporteChange={setAporteDisponivel}
            onAlocacaoChange={setAlocacaoCompleta}
            usdBrl={usdBrl}
            onUsdBrlChange={setUsdBrl}
          />
        )}
        {etapa === 3 && (
          <Etapa3PlanoAcao
            planoAcao={planoAcao}
            onPlanoAcao={setPlanoAcao}
            notasConsultor={notasConsultor}
            onNotasConsultor={setNotasConsultor}
            patrimonio={patrimonio}
            aporteDisponivel={aporteDisponivel}
            macroMeta={alocacaoMeta}
          />
        )}
        {etapa === 4 && (
          <Etapa4Resultado
            ativosAtuais={ativosAtuais}
            ativosRecomendados={ativosRecomendados}
            alocacaoMeta={alocacaoMeta}
            planoAcao={planoAcao}
            patrimonio={patrimonio}
            aporteDisponivel={aporteDisponivel}
            onSave={handleSalvarCarteira}
          />
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ flexShrink: 0, backgroundColor: "white", borderTop: "1px solid #BFDBFE", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={etapa === 1 ? onClose : handleBack}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            border: "1px solid #BFDBFE", borderRadius: 6, padding: "6px 12px",
            fontSize: 13, fontWeight: 500, color: "#374151", backgroundColor: "transparent", cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F0F7FF")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          {etapa === 1 ? "Fechar" : "Anterior"}
        </button>

        <span style={{ fontSize: 12, color: "#6B7280" }}>Etapa {etapa} de 4</span>

        {etapa < 4 ? (() => {
          const patrimonioMeta = patrimonio + aporteDisponivel;
          const totalAlocadoPct = CARD_ORDER.reduce((s, c) => s + (alocacaoMeta[c] ?? 0), 0);
          const totalAlocadoBRL = (totalAlocadoPct / 100) * patrimonioMeta;
          const diferencaBRL = patrimonioMeta - totalAlocadoBRL;
          const alocacaoFaltando = totalAlocadoPct < 99.9;

          const ativosManuaisSemObs = etapa === 2
            ? ativosRecomendados.filter((a) => a.adicionadoManualmente && !a.observacao?.trim())
            : [];

          const itensExigemObservacao = etapa === 3
            ? planoAcao.filter((item) => {
                if (item.adicionadoManualmente === true) return !item.observacao?.trim();
                const foiEditado =
                  item.movimentacaoEditada !== undefined &&
                  item.movimentacaoEditada !== Math.abs(item.movimentacaoBRL ?? 0);
                if (foiEditado) return !item.observacao?.trim();
                if (item.acao === "resgatar_parcial") return !item.observacao?.trim();
                if (item.acao === "manter") {
                  const valMeta = item.valorMetaBRL ?? 0;
                  if (valMeta === 0) return !item.observacao?.trim();
                  const valAtual = item.valorAtualBRL ?? 0;
                  if (valMeta > 0) {
                    const desvio = Math.abs(valAtual - valMeta) / valMeta * 100;
                    if (desvio > 5) return !item.observacao?.trim();
                  }
                }
                return false;
              })
            : [];

          const podeAvancar = etapa === 2
            ? alocacaoCompleta && ativosManuaisSemObs.length === 0
            : etapa === 3 ? itensExigemObservacao.length === 0 : true;

          return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <button
                onClick={() => { if (podeAvancar) handleNext(); }}
                disabled={!podeAvancar}
                title={!podeAvancar ? (etapa === 2 ? "Aloque 100% do patrimônio antes de avançar" : "Preencha a observação dos itens editados") : ""}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  backgroundColor: podeAvancar ? "#2563EB" : "#9CA3AF",
                  color: "white", border: "none", borderRadius: 6,
                  padding: "6px 14px", fontSize: 13, fontWeight: 500,
                  cursor: podeAvancar ? "pointer" : "not-allowed",
                  opacity: podeAvancar ? 1 : 0.7,
                  transition: "all 200ms",
                }}
                onMouseEnter={(e) => { if (podeAvancar) e.currentTarget.style.backgroundColor = "#1D4ED8"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = podeAvancar ? "#2563EB" : "#9CA3AF"; }}
              >
                {etapa === 3 ? "Ver resultado" : "Próxima etapa"}
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
              {etapa === 2 && !podeAvancar && (
                <div style={{ fontSize: 11, color: "#B45309", textAlign: "right" }}>
                  {alocacaoFaltando
                    ? `Aloque mais ${formatBRL(Math.abs(diferencaBRL))} para continuar`
                    : ativosManuaisSemObs.length > 0
                      ? `${ativosManuaisSemObs.length} ativo(s) manual(is) sem observação`
                      : `Reduza ${formatBRL(Math.abs(diferencaBRL))} para continuar`
                  }
                </div>
              )}
              {etapa === 3 && !podeAvancar && (
                <div style={{ fontSize: 11, color: "#B91C1C", textAlign: "right" }}>
                  {itensExigemObservacao.length} ativo(s) aguardam observação do consultor
                </div>
              )}
            </div>
          );
        })() : (
          <button
            onClick={handleSalvarCarteira}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              backgroundColor: salvo ? "#166534" : "#15803D", color: "white",
              border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#166534")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = salvo ? "#166534" : "#15803D")}
          >
            <Save style={{ width: 14, height: 14 }} />
            {salvo ? "Salvo!" : "Salvar carteira"}
          </button>
        )}
      </footer>
    </div>
  );
}

// Re-export for consumers that import genId from here
export { genId } from "@/lib/carteira/calculos";

// Re-export CARD_ORDER for any existing consumers
export { CARD_ORDER };
