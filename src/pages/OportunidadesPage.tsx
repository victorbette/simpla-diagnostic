import { useState, useMemo } from "react";
import { ChevronLeft, Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Client } from "@/hooks/useClientStore";
import { detectarOportunidades } from "@/lib/detectarOportunidades";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tipo = "seguros" | "imoveis" | "viagens";
type Prioridade = "alta" | "media" | "baixa";
type Filtro = "todas" | Tipo;

interface OportunidadeManual {
  id: string;
  tipo: Tipo;
  clienteId: string;
  clienteNome: string;
  titulo: string;
  descricao: string;
  prioridade: Prioridade;
  criadaEm: string;
}

interface DisplayOp {
  id: string;
  tipo: Tipo;
  clienteId: string;
  clienteNome: string;
  clientePerfil?: string;
  titulo: string;
  descricao: string;
  prioridade: Prioridade;
  origem: string;
  tipo_entrada: "auto" | "manual";
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TIPO_CFG: Record<Tipo, { label: string; bg: string; color: string; icon: string }> = {
  seguros: { label: "Seguros",          bg: "#FEE2E2", color: "#B91C1C", icon: "ti-shield"  },
  imoveis: { label: "Imóveis",          bg: "#FEF3C7", color: "#B45309", icon: "ti-home"    },
  viagens: { label: "Viagens e Milhas", bg: "#EFF6FF", color: "#2563EB", icon: "ti-plane"   },
};

const PRIORIDADE_CFG: Record<Prioridade, { label: string; color: string }> = {
  alta:  { label: "● Alta",  color: "#B91C1C" },
  media: { label: "● Média", color: "#B45309" },
  baixa: { label: "● Baixa", color: "#6B7280" },
};

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_MANUAL     = "oportunidades_manuais";
const LS_RESOLVIDAS = "oportunidades_resolvidas";

function loadManual(): OportunidadeManual[] {
  try { const r = localStorage.getItem(LS_MANUAL); if (r) return JSON.parse(r) as OportunidadeManual[]; } catch { /**/ }
  return [];
}
function saveManual(ops: OportunidadeManual[]) {
  try { localStorage.setItem(LS_MANUAL, JSON.stringify(ops)); } catch { /**/ }
}
function loadResolvidas(): Set<string> {
  try { const r = localStorage.getItem(LS_RESOLVIDAS); if (r) return new Set(JSON.parse(r) as string[]); } catch { /**/ }
  return new Set();
}
function saveResolvidas(ids: Set<string>) {
  try { localStorage.setItem(LS_RESOLVIDAS, JSON.stringify([...ids])); } catch { /**/ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nome: string): string {
  const words = nome.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  clientes: Client[];
  rawPlans: Record<string, Record<string, unknown>>;
  onVoltar: () => void;
  onAbrirCliente: (clienteId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OportunidadesPage({ clientes, rawPlans, onVoltar, onAbrirCliente }: Props) {
  const [filtro, setFiltro]             = useState<Filtro>("todas");
  const [busca, setBusca]               = useState("");
  const [resolvidas, setResolvidas]     = useState<Set<string>>(loadResolvidas);
  const [opsManual, setOpsManual]       = useState<OportunidadeManual[]>(loadManual);
  const [verResolvidas, setVerResolvidas] = useState(false);
  const [modalNovaOp, setModalNovaOp]   = useState(false);
  const [formOp, setFormOp] = useState({
    tipo: "seguros" as Tipo,
    clienteId: "",
    titulo: "",
    descricao: "",
    prioridade: "media" as Prioridade,
  });

  // ── Derived data ──────────────────────────────────────────────────────────

  const autoOps = useMemo(
    () => detectarOportunidades(clientes, rawPlans),
    [clientes, rawPlans]
  );

  const allOps = useMemo((): DisplayOp[] => {
    const auto: DisplayOp[] = autoOps.map((o) => ({
      id: o.id,
      tipo: o.tipo,
      clienteId: o.clienteId,
      clienteNome: o.clienteNome,
      clientePerfil: o.clientePerfil,
      titulo: o.titulo,
      descricao: o.descricao,
      prioridade: o.prioridade,
      origem: o.origem,
      tipo_entrada: "auto",
    }));
    const manual: DisplayOp[] = opsManual.map((o) => ({
      id: o.id,
      tipo: o.tipo,
      clienteId: o.clienteId,
      clienteNome: o.clienteNome,
      titulo: o.titulo,
      descricao: o.descricao,
      prioridade: o.prioridade,
      origem: "Manual",
      tipo_entrada: "manual",
    }));
    return [...auto, ...manual];
  }, [autoOps, opsManual]);

  const activeOps    = useMemo(() => allOps.filter((o) => !resolvidas.has(o.id)), [allOps, resolvidas]);
  const resolvidasOps = useMemo(() => allOps.filter((o) =>  resolvidas.has(o.id)), [allOps, resolvidas]);

  const filteredOps = useMemo(() => {
    let list = activeOps;
    if (filtro !== "todas") list = list.filter((o) => o.tipo === filtro);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter(
        (o) => o.clienteNome.toLowerCase().includes(q) || o.titulo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeOps, filtro, busca]);

  const counts = useMemo(() => ({
    seguros: activeOps.filter((o) => o.tipo === "seguros").length,
    imoveis: activeOps.filter((o) => o.tipo === "imoveis").length,
    viagens: activeOps.filter((o) => o.tipo === "viagens").length,
  }), [activeOps]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function marcarResolvida(id: string) {
    const next = new Set(resolvidas);
    next.add(id);
    setResolvidas(next);
    saveResolvidas(next);
    toast.success("Oportunidade resolvida.");
  }

  function reabrirOportunidade(id: string) {
    const next = new Set(resolvidas);
    next.delete(id);
    setResolvidas(next);
    saveResolvidas(next);
    toast.success("Oportunidade reaberta.");
  }

  function handleAdicionarOp() {
    if (!formOp.titulo.trim() || !formOp.clienteId) {
      toast.error("Selecione o cliente e preencha o título.");
      return;
    }
    const cliente = clientes.find((c) => c.id === formOp.clienteId);
    const nova: OportunidadeManual = {
      id: crypto.randomUUID(),
      tipo: formOp.tipo,
      clienteId: formOp.clienteId,
      clienteNome: cliente?.nome ?? "",
      titulo: formOp.titulo.trim(),
      descricao: formOp.descricao.trim(),
      prioridade: formOp.prioridade,
      criadaEm: new Date().toISOString(),
    };
    const updated = [nova, ...opsManual];
    setOpsManual(updated);
    saveManual(updated);
    setModalNovaOp(false);
    setFormOp({ tipo: "seguros", clienteId: "", titulo: "", descricao: "", prioridade: "media" });
    toast.success("Oportunidade adicionada.");
  }

  function handleRemoverManual(id: string) {
    const updated = opsManual.filter((o) => o.id !== id);
    setOpsManual(updated);
    saveManual(updated);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0F7FF" }}>

      {/* Header */}
      <header
        style={{ backgroundColor: "#1E3A8A", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button
            onClick={onVoltar}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #93C5FD", color: "#93C5FD", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            <ChevronLeft style={{ width: 15, height: 15 }} />
            Voltar
          </button>
          <div>
            <p style={{ color: "white", fontSize: 16, fontWeight: 700, margin: 0 }}>Oportunidades</p>
            <p style={{ color: "#93C5FD", fontSize: 13, margin: 0 }}>
              {activeOps.length} identificada{activeOps.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setVerResolvidas((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #93C5FD", color: "#93C5FD", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            <i className="ti ti-check-circle" style={{ fontSize: 14 }} />
            Ver resolvidas ({resolvidasOps.length})
          </button>
          <button
            onClick={() => { setFormOp({ tipo: "seguros", clienteId: "", titulo: "", descricao: "", prioridade: "media" }); setModalNovaOp(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid white", color: "white", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Nova oportunidade
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {(["seguros", "imoveis", "viagens"] as const).map((tipo) => {
            const cfg = TIPO_CFG[tipo];
            const isActive = filtro === tipo;
            return (
              <div
                key={tipo}
                onClick={() => setFiltro(filtro === tipo ? "todas" : tipo)}
                style={{
                  backgroundColor: "white", border: `1.5px solid ${isActive ? cfg.color : "#E5E7EB"}`,
                  borderRadius: 12, padding: "16px 20px", cursor: "pointer",
                  transition: "border-color 150ms",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{cfg.label}</span>
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className={`ti ${cfg.icon}`} style={{ fontSize: 16, color: cfg.color }} />
                  </div>
                </div>
                <p style={{ fontSize: 28, fontWeight: 700, color: cfg.color, margin: 0 }}>{counts[tipo]}</p>
              </div>
            );
          })}
        </div>

        {/* Search + filter pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9CA3AF" }} />
            <input
              type="text"
              placeholder="Buscar por cliente ou título..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ width: 280, padding: "8px 12px 8px 32px", borderRadius: 8, border: "1px solid #BFDBFE", fontSize: 13, outline: "none", backgroundColor: "white" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["todas", "seguros", "imoveis", "viagens"] as const).map((cat) => {
              const isActive = filtro === cat;
              const label = cat === "todas" ? "Todas" : TIPO_CFG[cat].label;
              return (
                <button
                  key={cat}
                  onClick={() => setFiltro(cat)}
                  style={{ fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${isActive ? "#1E3A8A" : "#E5E7EB"}`, backgroundColor: isActive ? "#1E3A8A" : "white", color: isActive ? "white" : "#6B7280", cursor: "pointer" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active opportunity cards */}
        {filteredOps.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <i className="ti ti-circle-check" style={{ fontSize: 44, display: "block", marginBottom: 12, color: "#15803D" }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>
              {filtro !== "todas"
                ? `Nenhuma oportunidade de ${TIPO_CFG[filtro].label} identificada`
                : "Nenhuma oportunidade identificada"}
            </p>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
              Adicione manualmente ou aguarde novos dados dos clientes.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {filteredOps.map((op) => (
              <OpCard
                key={op.id}
                op={op}
                onResolver={marcarResolvida}
                onVerCliente={onAbrirCliente}
                onRemoverManual={handleRemoverManual}
              />
            ))}
          </div>
        )}

        {/* Resolved section */}
        {verResolvidas && (
          <div style={{ borderTop: "2px dashed #E5E7EB", paddingTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", margin: 0 }}>
              <i className="ti ti-check-circle" style={{ marginRight: 6, color: "#15803D" }} />
              Oportunidades Resolvidas ({resolvidasOps.length})
            </p>
            {resolvidasOps.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Nenhuma oportunidade resolvida ainda.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {resolvidasOps.map((op) => {
                  const cfg = TIPO_CFG[op.tipo];
                  return (
                    <div key={op.id} style={{ backgroundColor: "#F9FAFB", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "16px 20px", opacity: 0.75 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, backgroundColor: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 8px", marginBottom: 8 }}>
                        <i className={`ti ${cfg.icon}`} style={{ fontSize: 11 }} />
                        {cfg.label}
                      </span>
                      <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 2px" }}>{op.clienteNome}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", margin: "0 0 10px" }}>{op.titulo}</p>
                      <button
                        onClick={() => reabrirOportunidade(op.id)}
                        style={{ fontSize: 12, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500 }}
                      >
                        Reabrir
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Nova oportunidade modal */}
      <Dialog open={modalNovaOp} onOpenChange={setModalNovaOp}>
        <DialogContent className="sm:max-w-[440px]" style={{ borderRadius: 12 }}>
          <DialogHeader><DialogTitle>Nova Oportunidade</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo <span className="text-[#B91C1C]">*</span></Label>
              <select
                value={formOp.tipo}
                onChange={(e) => setFormOp((p) => ({ ...p, tipo: e.target.value as Tipo }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 14, outline: "none" }}
              >
                {(["seguros", "imoveis", "viagens"] as const).map((t) => (
                  <option key={t} value={t}>{TIPO_CFG[t].label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Cliente <span className="text-[#B91C1C]">*</span></Label>
              <select
                value={formOp.clienteId}
                onChange={(e) => setFormOp((p) => ({ ...p, clienteId: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 14, outline: "none" }}
              >
                <option value="">Selecione o cliente...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Título <span className="text-[#B91C1C]">*</span></Label>
              <Input value={formOp.titulo} onChange={(e) => setFormOp((p) => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Seguro de vida" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Textarea rows={2} value={formOp.descricao} onChange={(e) => setFormOp((p) => ({ ...p, descricao: e.target.value }))} placeholder="Detalhes da oportunidade..." />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <select
                value={formOp.prioridade}
                onChange={(e) => setFormOp((p) => ({ ...p, prioridade: e.target.value as Prioridade }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 14, outline: "none" }}
              >
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalNovaOp(false)}>Cancelar</Button>
            <Button onClick={handleAdicionarOp} style={{ backgroundColor: "#1E3A8A", color: "white" }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── OpCard ───────────────────────────────────────────────────────────────────

interface OpCardProps {
  op: DisplayOp;
  onResolver: (id: string) => void;
  onVerCliente: (clienteId: string) => void;
  onRemoverManual: (id: string) => void;
}

function OpCard({ op, onResolver, onVerCliente, onRemoverManual }: OpCardProps) {
  const tipoCfg = TIPO_CFG[op.tipo];
  const priCfg  = PRIORIDADE_CFG[op.prioridade];
  const isManual = op.tipo_entrada === "manual";

  return (
    <div style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column" }}>
      {/* Top row: tipo badge + auto/manual badge + prioridade + remove */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, backgroundColor: tipoCfg.bg, color: tipoCfg.color, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 8px" }}>
            <i className={`ti ${tipoCfg.icon}`} style={{ fontSize: 11 }} />
            {tipoCfg.label}
          </span>
          {isManual ? (
            <span style={{ fontSize: 10, backgroundColor: "#F3F4F6", color: "#374151", borderRadius: 4, padding: "2px 6px", fontWeight: 600 }}>Manual</span>
          ) : (
            <span style={{ fontSize: 10, backgroundColor: "#F0F9FF", color: "#0369A1", borderRadius: 4, padding: "2px 6px", fontWeight: 600 }}>Auto</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: priCfg.color, fontWeight: 600 }}>{priCfg.label}</span>
          {isManual && (
            <button
              onClick={() => onRemoverManual(op.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#D1D5DB", padding: 2, display: "flex" }}
              title="Remover"
            >
              <X style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>
      </div>

      {/* Cliente */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#DBEAFE", color: "#1E3A8A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          {getInitials(op.clienteNome)}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{op.clienteNome}</span>
      </div>

      {/* Título */}
      <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "8px 0 0" }}>{op.titulo}</p>

      {/* Descrição */}
      {op.descricao && (
        <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5, margin: "4px 0 0" }}>{op.descricao}</p>
      )}

      {/* Origem */}
      <p style={{ fontSize: 10, color: "#9CA3AF", margin: "8px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
        <i className="ti ti-database" style={{ fontSize: 10 }} />
        Fonte: {op.origem}
      </p>

      {/* Footer */}
      <div style={{ borderTop: "0.5px solid #F3F4F6", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => onVerCliente(op.clienteId)}
          style={{ fontSize: 12, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}
        >
          Ver cliente →
        </button>
        <button
          onClick={() => onResolver(op.id)}
          style={{ fontSize: 12, color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          Resolver
        </button>
      </div>
    </div>
  );
}
