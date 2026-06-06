import { useState, useMemo, useEffect } from "react";
import {
  Search,
  LogOut,
  MoreHorizontal,
  UserPlus,
  Plus,
  Users,
  X,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FinancialPlanningPage } from "@/components/financialPlanning/FinancialPlanningPage";
import { AcompanhamentoPage } from "@/pages/AcompanhamentoPage";
import { useAuth } from "@/contexts/AuthContext";
import { useClientStore } from "@/hooks/useClientStore";
import type { Client } from "@/hooks/useClientStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashFPStatus = "sem_fp" | "iniciado" | "em_andamento" | "completo";
type OpCategoria = "seguros" | "imoveis" | "viagens" | "outros";
type FiltroOp = "todas" | OpCategoria;

interface DashPlan {
  rendaMensal: number;
  idadeMeta: number;
  temFilhos: boolean;
  possuiSeguroVida: boolean;
  possuiSeguroInvalidez: boolean;
  tipoDeclaracao: string;
  possuiImoveis: boolean;
  patrimonioTotal: number;
  fazViagensInternacionais: boolean;
  valorFaturaCartao: number;
  temEstrategia: boolean;
}

interface OpManual {
  id: string;
  clienteId: string;
  clienteNome: string;
  titulo: string;
  descricao: string;
  categoria: OpCategoria;
  criadaEm: string;
}

interface AutoOp {
  id: string;
  clienteId: string;
  clienteNome: string;
  titulo: string;
  descricao: string;
  categoria: OpCategoria;
  tipo: "auto";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nome: string): string {
  const words = nome.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function calcularStatusFP(client: Client, plan: DashPlan | null): DashFPStatus {
  if (client.planStatus === "nao_iniciado" || !plan) return "sem_fp";
  if (plan.temEstrategia) return "completo";
  if (plan.rendaMensal > 0 || client.planSuitabilityPerfil) return "em_andamento";
  return "iniciado";
}

function detectarPendencias(client: Client, plan: DashPlan | null): string[] {
  if (!plan || client.planStatus === "nao_iniciado") return ["FP não iniciado"];
  const p: string[] = [];
  if (!client.planSuitabilityPerfil) p.push("Suitability pendente");
  if (!plan.rendaMensal) p.push("Renda não preenchida");
  if (!plan.idadeMeta) p.push("Idade meta IF");
  if (plan.temFilhos && !plan.possuiSeguroVida) p.push("Seguro de vida");
  if (plan.tipoDeclaracao === "nao_sei") p.push("Tipo de IR");
  return p;
}

function detectarOportunidades(client: Client, plan: DashPlan | null): AutoOp[] {
  if (!plan) return [];
  const ops: AutoOp[] = [];
  if (!plan.possuiSeguroVida && plan.rendaMensal > 3000) {
    ops.push({ id: `${client.id}-sv`, clienteId: client.id, clienteNome: client.nome, titulo: "Seguro de vida", descricao: "Renda relevante sem cobertura de vida", categoria: "seguros", tipo: "auto" });
  }
  if (!plan.possuiSeguroInvalidez) {
    ops.push({ id: `${client.id}-si`, clienteId: client.id, clienteNome: client.nome, titulo: "Seguro de invalidez", descricao: "Sem proteção contra incapacidade laboral", categoria: "seguros", tipo: "auto" });
  }
  if (!plan.possuiImoveis && plan.patrimonioTotal > 200000) {
    ops.push({ id: `${client.id}-im`, clienteId: client.id, clienteNome: client.nome, titulo: "Investimento em imóveis", descricao: "Patrimônio sem exposição imobiliária", categoria: "imoveis", tipo: "auto" });
  }
  if (plan.fazViagensInternacionais && plan.valorFaturaCartao > 1000) {
    ops.push({ id: `${client.id}-mi`, clienteId: client.id, clienteNome: client.nome, titulo: "Cartão de milhas", descricao: "Viagens internacionais sem milhas otimizadas", categoria: "viagens", tipo: "auto" });
  }
  return ops;
}

function profileConfig(perfil: string | null | undefined) {
  switch (perfil) {
    case "moderado":           return { badgeBg: "#EFF6FF", badgeText: "#2563EB", dotColor: "#2563EB", label: "MODERADO" };
    case "conservador":        return { badgeBg: "#EAF0F5", badgeText: "#1E40AF", dotColor: "#3B82F6", label: "CONSERVADOR" };
    case "conservador_moderado": return { badgeBg: "#EAF0F5", badgeText: "#1E40AF", dotColor: "#3B82F6", label: "CONS. MODERADO" };
    case "arrojado":           return { badgeBg: "#FEE2E2", badgeText: "#B91C1C", dotColor: "#B91C1C", label: "ARROJADO" };
    default:                   return { badgeBg: "#F0F7FF", badgeText: "#6B7280", dotColor: "#BFDBFE", label: "SEM PERFIL" };
  }
}

const FP_STATUS_CFG: Record<DashFPStatus, { label: string; color: string; dot: string }> = {
  sem_fp:       { label: "Não iniciado",  color: "#6B7280", dot: "#D1D5DB" },
  iniciado:     { label: "Iniciado",      color: "#0891B2", dot: "#67E8F9" },
  em_andamento: { label: "Em andamento",  color: "#0891B2", dot: "#3B82F6" },
  completo:     { label: "Completo",      color: "#15803D", dot: "#15803D" },
};

const OP_CAT_CFG: Record<OpCategoria, { label: string; bg: string; color: string; icon: string }> = {
  seguros: { label: "Seguros", bg: "#FEF3C7", color: "#92400E", icon: "ti-shield-check" },
  imoveis: { label: "Imóveis", bg: "#DCFCE7", color: "#166534", icon: "ti-building" },
  viagens: { label: "Viagens", bg: "#EDE9FE", color: "#6D28D9", icon: "ti-plane" },
  outros:  { label: "Outros",  bg: "#F3F4F6", color: "#6B7280", icon: "ti-bulb" },
};

// ─── Form / localStorage helpers ──────────────────────────────────────────────

interface ClientForm {
  nome: string; email: string; telefone: string;
  cpf: string; nascimento: string; observacoes: string;
}
const EMPTY_FORM: ClientForm = { nome: "", email: "", telefone: "", cpf: "", nascimento: "", observacoes: "" };

function loadOpsManual(userId: string): OpManual[] {
  try { const r = localStorage.getItem(`oportunidades_manuais_${userId}`); if (r) return JSON.parse(r) as OpManual[]; } catch { /**/ }
  return [];
}
function saveOpsManual(userId: string, ops: OpManual[]) {
  try { localStorage.setItem(`oportunidades_manuais_${userId}`, JSON.stringify(ops)); } catch { /**/ }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HomePage() {
  const { user, signOut } = useAuth();
  const clientStore = useClientStore();

  const [clienteSelecionado, setClienteSelecionado] = useState<Client | null>(null);
  const [clienteAcompanhamento, setClienteAcompanhamento] = useState<Client | null>(null);

  const [search, setSearch] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const [plansMap, setPlansMap] = useState<Record<string, DashPlan | null>>({});

  const [filtroOp, setFiltroOp] = useState<FiltroOp>("todas");
  const [opsManual, setOpsManual] = useState<OpManual[]>(() => loadOpsManual(user?.id ?? ""));
  const [modalOp, setModalOp] = useState(false);
  const [formOp, setFormOp] = useState({ clienteId: "", titulo: "", descricao: "", categoria: "seguros" as OpCategoria });

  // Batch-load plans whenever the set of planIds changes
  const planIdsKey = clientStore.clients.map((c) => c.planId ?? "").join(",");
  useEffect(() => {
    const planIds = clientStore.clients.filter((c) => c.planId).map((c) => c.planId as string);
    if (planIds.length === 0) { setPlansMap({}); return; }

    supabase
      .from("financial_plans")
      .select("id, client_id, dados_cliente, planejamento_if, protecao, fiscal, estrategia_inicial")
      .in("id", planIds)
      .then(({ data }) => {
        const map: Record<string, DashPlan | null> = {};
        for (const c of clientStore.clients) {
          if (!c.planId) { map[c.id] = null; continue; }
          const row = (data ?? []).find((r) => r.id === c.planId);
          if (!row) { map[c.id] = null; continue; }
          const dc = (row.dados_cliente as Record<string, unknown>) ?? {};
          const pif = (row.planejamento_if as Record<string, unknown>) ?? {};
          const prot = (row.protecao as Record<string, unknown>) ?? {};
          const fis = (row.fiscal as Record<string, unknown>) ?? {};
          map[c.id] = {
            rendaMensal: (dc.rendaMensal as number) ?? 0,
            idadeMeta: (pif.idadeMeta as number) ?? 0,
            temFilhos: (dc.temFilhos as boolean) ?? false,
            possuiSeguroVida: (prot.possuiSeguroVida as boolean) ?? false,
            possuiSeguroInvalidez: (prot.possuiSeguroInvalidez as boolean) ?? false,
            tipoDeclaracao: (fis.tipoDeclaracao as string) ?? "nao_sei",
            possuiImoveis: (dc.possuiImoveis as boolean) ?? false,
            patrimonioTotal: (dc.patrimonioTotalEstimado as number) ?? 0,
            fazViagensInternacionais: (dc.fazViagensInternacionais as boolean) ?? false,
            valorFaturaCartao: (dc.valorFaturaCartao as number) ?? 0,
            temEstrategia: row.estrategia_inicial != null,
          };
        }
        setPlansMap(map);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planIdsKey]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clientStore.clients;
    return clientStore.clients.filter(
      (c) => c.nome.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q)
    );
  }, [clientStore.clients, search]);

  const autoOps = useMemo<AutoOp[]>(
    () => clientStore.clients.flatMap((c) => detectarOportunidades(c, plansMap[c.id] ?? null)),
    [clientStore.clients, plansMap]
  );

  const allOps = useMemo(() => {
    const manual = opsManual.map((o) => ({ ...o, tipo: "manual" as const }));
    const auto = autoOps.map((o) => ({ ...o, criadaEm: "", tipo: "auto" as const }));
    return [...auto, ...manual];
  }, [autoOps, opsManual]);

  const filteredOps = useMemo(
    () => (filtroOp === "todas" ? allOps : allOps.filter((o) => o.categoria === filtroOp)),
    [allOps, filtroOp]
  );

  const totalCompleto = useMemo(
    () => clientStore.clients.filter((c) => calcularStatusFP(c, plansMap[c.id] ?? null) === "completo").length,
    [clientStore.clients, plansMap]
  );

  const totalPendencias = useMemo(
    () => clientStore.clients.filter((c) => detectarPendencias(c, plansMap[c.id] ?? null).length > 0).length,
    [clientStore.clients, plansMap]
  );

  const userLabel = (user?.email ?? "").split("@")[0] || "Consultor";
  const userInitials = userLabel.slice(0, 2).toUpperCase();

  // ── Overlays ─────────────────────────────────────────────────────────────

  if (clienteSelecionado) {
    return (
      <FinancialPlanningPage
        clientId={clienteSelecionado.id}
        clientName={clienteSelecionado.nome}
        onClose={() => setClienteSelecionado(null)}
      />
    );
  }

  if (clienteAcompanhamento) {
    return (
      <AcompanhamentoPage
        clienteId={clienteAcompanhamento.id}
        clienteNome={clienteAcompanhamento.nome}
        onVoltar={() => setClienteAcompanhamento(null)}
      />
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function openNovoCliente() {
    setClienteEditando(null);
    setForm(EMPTY_FORM);
    setModalAberto(true);
  }

  function openEditarCliente(c: Client) {
    setClienteEditando(c);
    setForm({ nome: c.nome, email: c.email ?? "", telefone: c.telefone ?? "", cpf: "", nascimento: "", observacoes: "" });
    setModalAberto(true);
  }

  async function handleSalvarCliente() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório."); return; }
    setSalvando(true);
    try {
      if (clienteEditando) {
        await clientStore.atualizarCliente(clienteEditando.id, {
          nome: form.nome.trim(), email: form.email.trim() || null,
          telefone: form.telefone.trim() || null, cpf: form.cpf.trim() || null,
          dataNascimento: form.nascimento.trim() || null,
          observacoes: form.observacoes.trim() || null,
        });
        toast.success("Cliente atualizado.");
      } else {
        await clientStore.criarCliente({
          nome: form.nome.trim(), email: form.email.trim() || undefined,
          telefone: form.telefone.trim() || undefined, cpf: form.cpf.trim() || undefined,
          dataNascimento: form.nascimento.trim() || undefined,
          observacoes: form.observacoes.trim() || undefined,
        });
        toast.success("Cliente adicionado.");
      }
      setModalAberto(false);
    } catch { toast.error("Erro ao salvar cliente."); }
    finally { setSalvando(false); }
  }

  async function handleConfirmarExcluir() {
    if (!deleteTarget) return;
    try {
      await clientStore.deleteClient(deleteTarget.id);
      toast.success("Cliente excluído.");
    } catch { toast.error("Erro ao excluir cliente."); }
    finally { setDeleteTarget(null); }
  }

  function handleAdicionarOp() {
    if (!formOp.titulo.trim() || !formOp.clienteId) { toast.error("Selecione o cliente e preencha o título."); return; }
    const cliente = clientStore.clients.find((c) => c.id === formOp.clienteId);
    const nova: OpManual = {
      id: crypto.randomUUID(),
      clienteId: formOp.clienteId,
      clienteNome: cliente?.nome ?? "",
      titulo: formOp.titulo.trim(),
      descricao: formOp.descricao.trim(),
      categoria: formOp.categoria,
      criadaEm: new Date().toISOString(),
    };
    const updated = [nova, ...opsManual];
    setOpsManual(updated);
    saveOpsManual(user?.id ?? "", updated);
    setModalOp(false);
    setFormOp({ clienteId: "", titulo: "", descricao: "", categoria: "seguros" });
    toast.success("Oportunidade adicionada.");
  }

  function handleRemoverOpManual(id: string) {
    const updated = opsManual.filter((o) => o.id !== id);
    setOpsManual(updated);
    saveOpsManual(user?.id ?? "", updated);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const totalClientes = clientStore.clients.length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0F7FF" }}>

      {/* Header */}
      <header className="sticky top-0 z-40" style={{ backgroundColor: "#1E3A8A" }}>
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <div className="flex-1 flex items-center">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src="/logo-si.svg" alt="Simpla Invest" style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 4 }} />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ color: "#FFFFFF", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15 }}>Simpla Invest</span>
                <span style={{ color: "#93C5FD", fontFamily: "Poppins, sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: "0.04em" }}>Financial Planning</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium leading-tight">{userLabel}</p>
              <p className="text-[#9CA3AF] text-xs leading-tight">Consultor financeiro</p>
            </div>
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none" style={{ backgroundColor: "#3B82F6", color: "#000" }}>
              {userInitials}
            </div>
            <button onClick={signOut} className="text-[#9CA3AF] hover:text-white transition-colors p-1" title="Sair">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {clientStore.loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#9CA3AF" }}>
            <i className="ti ti-loader-2" style={{ fontSize: 40, display: "block", marginBottom: 12, color: "#BFDBFE" }} />
            <p style={{ margin: 0 }}>Carregando clientes...</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* Title + search */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <p className="font-semibold uppercase tracking-widest mb-1" style={{ color: "#3B82F6", fontSize: 11 }}>DASHBOARD</p>
                <div className="flex items-baseline gap-3">
                  <h1 className="font-bold" style={{ color: "#111827", fontSize: 28 }}>CRM — Clientes</h1>
                  <span style={{ color: "#6B7280", fontSize: 16 }}>({totalClientes})</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#9CA3AF" }} />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2.5 text-sm border border-[#BFDBFE] rounded-lg bg-white outline-none focus:ring-2 focus:ring-offset-1 transition"
                    style={{ width: 260 }}
                  />
                </div>
                <button
                  onClick={openNovoCliente}
                  className="flex items-center gap-2 text-white text-sm font-medium rounded-lg px-5 py-3 transition hover:opacity-90"
                  style={{ backgroundColor: "#1E3A8A" }}
                >
                  <UserPlus className="h-4 w-4" />
                  Novo Cliente
                </button>
              </div>
            </div>

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {[
                { label: "Total Clientes",  value: totalClientes,   icon: "ti-users",         color: "#1E3A8A", bg: "#EFF6FF" },
                { label: "FP Completo",     value: totalCompleto,   icon: "ti-check-circle",  color: "#15803D", bg: "#DCFCE7" },
                { label: "Com Pendências",  value: totalPendencias, icon: "ti-alert-circle",  color: "#B45309", bg: "#FEF3C7" },
                { label: "Oportunidades",   value: allOps.length,   icon: "ti-star",          color: "#7C3AED", bg: "#EDE9FE" },
              ].map(({ label, value, icon, color, bg }) => (
                <div key={label} style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{label}</span>
                    <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className={`ti ${icon}`} style={{ fontSize: 16, color }} />
                    </div>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 700, color, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Client table */}
            {totalClientes === 0 ? (
              <div className="flex flex-col items-center gap-4 py-24 text-center">
                <Users className="h-16 w-16" style={{ color: "#9CA3AF" }} />
                <h2 className="text-xl font-semibold" style={{ color: "#111827" }}>Nenhum cliente cadastrado</h2>
                <p className="text-sm" style={{ color: "#6B7280" }}>Adicione seu primeiro cliente para começar</p>
                <button onClick={openNovoCliente} className="mt-2 flex items-center gap-2 text-white text-sm font-medium rounded-lg px-6 py-3 transition hover:opacity-90" style={{ backgroundColor: "#1E3A8A" }}>
                  <Plus className="h-4 w-4" />
                  Adicionar primeiro cliente
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <Search className="h-14 w-14" style={{ color: "#9CA3AF" }} />
                <h2 className="text-lg font-semibold" style={{ color: "#111827" }}>Nenhum resultado para &ldquo;{search}&rdquo;</h2>
                <button onClick={() => setSearch("")} className="mt-2 border border-[#93C5FD] text-sm font-medium rounded-lg px-5 py-2.5 bg-white hover:bg-[#F0F7FF] transition" style={{ color: "#111827" }}>
                  Limpar busca
                </button>
              </div>
            ) : (
              <div style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
                {/* Header row */}
                <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1.2fr 1fr 1.2fr 2fr", gap: 8, padding: "10px 20px", backgroundColor: "#1E3A8A" }}>
                  {["CLIENTE", "PERFIL", "STATUS FP", "ÚLTIMA ATZ.", "PENDÊNCIAS", "AÇÕES"].map((h) => (
                    <span key={h} style={{ color: "white", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>{h}</span>
                  ))}
                </div>

                {/* Data rows */}
                {filtered.map((c) => {
                  const plan = plansMap[c.id] ?? null;
                  const fpStatus = calcularStatusFP(c, plan);
                  const fpCfg = FP_STATUS_CFG[fpStatus];
                  const pc = profileConfig(c.planSuitabilityPerfil);
                  const pendencias = detectarPendencias(c, plan);
                  const ultimaAtZ = c.planUpdatedAt ?? c.dataCriacao;

                  return (
                    <div
                      key={c.id}
                      style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1.2fr 1fr 1.2fr 2fr", gap: 8, padding: "12px 20px", borderTop: "1px solid #F3F4F6", alignItems: "center" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                    >
                      {/* Cliente */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#DBEAFE", color: "#1E3A8A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {getInitials(c.nome)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</p>
                          {c.email && <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{c.email}</p>}
                        </div>
                      </div>

                      {/* Perfil */}
                      <div>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, backgroundColor: pc.badgeBg, color: pc.badgeText, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", borderRadius: 20, padding: "2px 8px" }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: pc.dotColor, display: "inline-block" }} />
                          {pc.label}
                        </span>
                      </div>

                      {/* Status FP */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: fpCfg.dot, display: "inline-block", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: fpCfg.color, fontWeight: 500 }}>{fpCfg.label}</span>
                      </div>

                      {/* Última Atualização */}
                      <span style={{ fontSize: 12, color: "#6B7280" }}>{formatDate(ultimaAtZ)}</span>

                      {/* Pendências */}
                      <div>
                        {pendencias.length === 0 ? (
                          <span style={{ fontSize: 12, color: "#15803D" }}>
                            <i className="ti ti-check" style={{ marginRight: 3 }} />Nenhuma
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", color: "#92400E", fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "2px 10px" }}>
                            <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} />
                            {pendencias.length} {pendencias.length === 1 ? "item" : "itens"}
                          </span>
                        )}
                      </div>

                      {/* Ações */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => setClienteSelecionado(c)}
                          style={{ fontSize: 12, fontWeight: 600, color: "#1E3A8A", backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 7, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                          title="Financial Planning"
                        >
                          <i className="ti ti-clipboard-list" style={{ fontSize: 12 }} />FP
                        </button>
                        <button
                          onClick={() => setClienteAcompanhamento(c)}
                          style={{ fontSize: 12, fontWeight: 600, color: "white", backgroundColor: "#1E3A8A", border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                          title="Acompanhamento Consultivo"
                        >
                          <i className="ti ti-chart-bar" style={{ fontSize: 12 }} />Acomp.
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, cursor: "pointer", backgroundColor: "transparent", border: "1px solid #E5E7EB", color: "#9CA3AF" }}>
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditarCliente(c)}>Editar cliente</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTarget(c)} className="text-[#B91C1C] focus:text-[#B91C1C]">Excluir cliente</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Oportunidades section */}
            {totalClientes > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>CROSS-SELL</p>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Oportunidades</h2>
                  </div>
                  <button
                    onClick={() => { setFormOp({ clienteId: "", titulo: "", descricao: "", categoria: "seguros" }); setModalOp(true); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "white", backgroundColor: "#1E3A8A", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}
                  >
                    <Plus className="h-4 w-4" />
                    Nova oportunidade
                  </button>
                </div>

                {/* Filter pills */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(["todas", "seguros", "imoveis", "viagens", "outros"] as const).map((cat) => {
                    const isActive = filtroOp === cat;
                    const label = cat === "todas" ? "Todas" : OP_CAT_CFG[cat].label;
                    return (
                      <button
                        key={cat}
                        onClick={() => setFiltroOp(cat)}
                        style={{ fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${isActive ? "#1E3A8A" : "#E5E7EB"}`, backgroundColor: isActive ? "#1E3A8A" : "white", color: isActive ? "white" : "#6B7280", cursor: "pointer" }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Cards */}
                {filteredOps.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 14 }}>
                    <i className="ti ti-star-off" style={{ fontSize: 36, display: "block", marginBottom: 10 }} />
                    Nenhuma oportunidade detectada
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                    {filteredOps.map((op) => {
                      const catCfg = OP_CAT_CFG[op.categoria];
                      const isManual = op.tipo === "manual";
                      return (
                        <div key={op.id} style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ backgroundColor: catCfg.bg, borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: catCfg.color, display: "flex", alignItems: "center", gap: 4 }}>
                                <i className={`ti ${catCfg.icon}`} style={{ fontSize: 11 }} />
                                {catCfg.label}
                              </span>
                              {isManual && (
                                <span style={{ fontSize: 10, color: "#9CA3AF", backgroundColor: "#F3F4F6", borderRadius: 4, padding: "2px 6px" }}>Manual</span>
                              )}
                            </div>
                            {isManual && (
                              <button onClick={() => handleRemoverOpManual(op.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#D1D5DB", padding: 2 }}>
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 3px" }}>{op.clienteNome}</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{op.titulo}</p>
                          {op.descricao && (
                            <p style={{ fontSize: 12, color: "#6B7280", margin: 0, lineHeight: 1.4 }}>{op.descricao}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add/Edit client modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-[480px]" style={{ borderRadius: 12, padding: 32 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 20 }}>{clienteEditando ? "Editar cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-nome">Nome completo <span className="text-[#B91C1C]">*</span></Label>
              <Input id="m-nome" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" disabled={salvando} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-email">Email</Label>
              <Input id="m-email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" disabled={salvando} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-tel">Telefone</Label>
              <Input id="m-tel" type="tel" value={form.telefone} onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))} placeholder="(99) 99999-9999" disabled={salvando} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-cpf">CPF</Label>
              <Input id="m-cpf" value={form.cpf} onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))} placeholder="999.999.999-99" disabled={salvando} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-nasc">Data de nascimento</Label>
              <Input id="m-nasc" type="date" value={form.nascimento} onChange={(e) => setForm((p) => ({ ...p, nascimento: e.target.value }))} disabled={salvando} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-obs">Observações</Label>
              <Textarea id="m-obs" rows={3} value={form.observacoes} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} placeholder="Anotações sobre o cliente..." disabled={salvando} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalAberto(false)} disabled={salvando}>Cancelar</Button>
            <Button onClick={handleSalvarCliente} disabled={salvando} style={{ backgroundColor: "#1E3A8A", color: "white" }}>
              {salvando ? "Salvando..." : "Salvar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md" style={{ borderRadius: 12 }}>
          <DialogHeader><DialogTitle>Excluir cliente</DialogTitle></DialogHeader>
          <p className="text-sm text-[#6B7280] py-2">
            Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmarExcluir}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add manual oportunidade modal */}
      <Dialog open={modalOp} onOpenChange={setModalOp}>
        <DialogContent className="sm:max-w-[440px]" style={{ borderRadius: 12 }}>
          <DialogHeader><DialogTitle>Nova Oportunidade</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Cliente <span className="text-[#B91C1C]">*</span></Label>
              <select
                value={formOp.clienteId}
                onChange={(e) => setFormOp((p) => ({ ...p, clienteId: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 14, outline: "none" }}
              >
                <option value="">Selecione o cliente...</option>
                {clientStore.clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <select
                value={formOp.categoria}
                onChange={(e) => setFormOp((p) => ({ ...p, categoria: e.target.value as OpCategoria }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 14, outline: "none" }}
              >
                {(["seguros", "imoveis", "viagens", "outros"] as const).map((cat) => (
                  <option key={cat} value={cat}>{OP_CAT_CFG[cat].label}</option>
                ))}
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
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOp(false)}>Cancelar</Button>
            <Button onClick={handleAdicionarOp} style={{ backgroundColor: "#1E3A8A", color: "white" }}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
