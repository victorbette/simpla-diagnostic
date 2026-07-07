import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  FinancialPlan,
  SuitabilityResult,
  AtivoAtual,
  MacroalocacaoAlvo,
  PlanejamentoIF,
  ProtecaoSimplificada,
  PlanejamentoFiscal,
  PlanejamentoSucessorio,
  DadosCliente,
} from "@/types/financialPlanning";
import { initialDadosCliente } from "@/types/financialPlanning";

// ─── Status calculation ───────────────────────────────────────────────────────

function calcularStatus(
  dadosCliente: Record<string, unknown> | null | undefined,
  estrategia: Record<string, unknown> | null | undefined
): "nao_iniciado" | "rascunho" | "completo" {
  const dc = dadosCliente ?? {};
  const est = estrategia ?? {};
  const temCarteira =
    est.carteira != null &&
    Number((est.carteira as Record<string, unknown>)?.patrimonio ?? 0) > 0;
  const temIF = est["if"] != null && Object.keys(est["if"] as object).length > 0;
  const temProtecao =
    est.seguro != null && Object.keys(est.seguro as object).length > 0;
  if (temCarteira && temIF && temProtecao) return "completo";
  const temDadosColeta =
    Number(dc.rendaMensal) > 0 ||
    Number(dc.patrimonioTotal) > 0 ||
    Boolean(dc.suitabilityPerfil);
  if (temDadosColeta) return "rascunho";
  return "nao_iniciado";
}

// ─── DB row → FinancialPlan ───────────────────────────────────────────────────

interface PlanRow {
  id: string;
  client_id: string;
  suitability: Record<string, unknown> | null;
  dados_cliente: Record<string, unknown> | null;
  ativos_atuais: Record<string, unknown>;
  alocacao_personalizada: Record<string, unknown> | null;
  planejamento_if: Record<string, unknown>;
  protecao: Record<string, unknown>;
  fiscal: Record<string, unknown>;
  sucessorio: Record<string, unknown>;
  notas_assessor: string;
  estrategia_inicial: Record<string, unknown> | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function rowToPlan(row: PlanRow): FinancialPlan {
  return {
    id: row.id,
    clientId: row.client_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    suitability: (row.suitability as unknown as SuitabilityResult) ?? null,
    dadosCliente: (row.dados_cliente as unknown as DadosCliente) ?? { ...initialDadosCliente },
    ativosAtuais: row.ativos_atuais as unknown as AtivoAtual,
    alocacaoPersonalizada: (row.alocacao_personalizada as unknown as MacroalocacaoAlvo) ?? null,
    planejamentoIF: row.planejamento_if as unknown as PlanejamentoIF,
    protecao: row.protecao as unknown as ProtecaoSimplificada,
    fiscal: row.fiscal as unknown as PlanejamentoFiscal,
    sucessorio: row.sucessorio as unknown as PlanejamentoSucessorio,
    notasConsultor: row.notas_assessor ?? "",
    status: (row.status ?? "rascunho") as FinancialPlan["status"],
  };
}

function planToPayload(plan: FinancialPlan): Record<string, unknown> {
  return {
    client_id: plan.clientId,
    suitability: (plan.suitability ?? null) as unknown as Record<string, unknown> | null,
    dados_cliente: plan.dadosCliente as unknown as Record<string, unknown>,
    ativos_atuais: plan.ativosAtuais as unknown as Record<string, unknown>,
    alocacao_personalizada: (plan.alocacaoPersonalizada ?? null) as unknown as Record<string, unknown> | null,
    planejamento_if: plan.planejamentoIF as unknown as Record<string, unknown>,
    protecao: plan.protecao as unknown as Record<string, unknown>,
    fiscal: plan.fiscal as unknown as Record<string, unknown>,
    sucessorio: plan.sucessorio as unknown as Record<string, unknown>,
    notas_assessor: plan.notasConsultor ?? "",
    status: plan.status ?? "rascunho",
    updated_at: new Date().toISOString(),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFinancialPlanStore() {
  const [plan, setPlan] = useState<FinancialPlan | null>(null);
  // Ref keeps plan accessible synchronously after async operations
  const planRef = useRef<FinancialPlan | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimoSalvo, setUltimoSalvo] = useState<Date | null>(null);

  const setPlanSafe = useCallback((p: FinancialPlan | null) => {
    planRef.current = p;
    setPlan(p);
  }, []);

  // ── Explicit per-client load (for FinancialPlanningPage init) ─────────────

  const carregarPlano = useCallback(async (clientId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("financial_plans")
        .select("*")
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setPlanSafe(data ? rowToPlan(data as unknown as PlanRow) : null);
    } catch (err) {
      console.error("useFinancialPlanStore: carregarPlano failed", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar plano");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Create blank plan ─────────────────────────────────────────────────────

  const criarPlano = useCallback(async (clientId: string): Promise<FinancialPlan> => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error("Usuário não autenticado");

    const { data, error: insertError } = await supabase
      .from("financial_plans")
      .insert({
        client_id: clientId,
        dados_cliente: {},
        ativos_atuais: {},
        alocacao_personalizada: null,
        planejamento_if: {},
        protecao: {},
        fiscal: {},
        sucessorio: {},
        notas_assessor: "",
        status: "nao_iniciado",
      })
      .select()
      .single();

    if (insertError) {
      console.error("useFinancialPlanStore: criarPlano failed", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });
      throw new Error(insertError.message);
    }

    const novo = rowToPlan(data as unknown as PlanRow);
    setPlanSafe(novo);
    return novo;
  }, []);

  // ── Upsert (save or create) ───────────────────────────────────────────────

  const savePlan = useCallback(async (planAtual: FinancialPlan): Promise<FinancialPlan> => {
    setSaving(true);
    setError(null);
    try {
      const payload = planToPayload(planAtual);

      if (planAtual.id) {
        // Pre-fetch estrategia_inicial (not in FinancialPlan type) to compute status
        const { data: estRow } = await supabase
          .from("financial_plans")
          .select("estrategia_inicial")
          .eq("id", planAtual.id)
          .single();
        const estrategiaAtual =
          (estRow as unknown as { estrategia_inicial: Record<string, unknown> | null } | null)
            ?.estrategia_inicial ?? null;
        payload.status = calcularStatus(
          planAtual.dadosCliente as unknown as Record<string, unknown>,
          estrategiaAtual
        );

        const { data, error: updateError } = await supabase
          .from("financial_plans")
          .update(payload)
          .eq("id", planAtual.id)
          .select()
          .single();

        if (updateError) {
          console.error("savePlan (update) — Supabase error:", {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code,
          });
          throw updateError;
        }

        const updated = rowToPlan(data as unknown as PlanRow);
        setPlanSafe(updated);
        setUltimoSalvo(new Date());
        return updated;
      } else {
        const { data, error: insertError } = await supabase
          .from("financial_plans")
          .insert(payload)
          .select()
          .single();

        if (insertError) {
          console.error("savePlan (insert) — Supabase error:", {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code,
          });
          throw insertError;
        }

        const created = rowToPlan(data as unknown as PlanRow);
        setPlanSafe(created);
        setUltimoSalvo(new Date());
        return created;
      }
    } catch (err) {
      console.error("useFinancialPlanStore: savePlan failed", err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const salvarPlano = savePlan;

  // ── Estratégia Inicial ────────────────────────────────────────────────────

  const saveEstrategia = useCallback(
    async (planId: string, estrategia: Record<string, unknown>): Promise<void> => {
      const dcRaw = (planRef.current?.dadosCliente ?? {}) as Record<string, unknown>;
      const novoStatus = calcularStatus(dcRaw, estrategia);

      const { error: updateError } = await supabase
        .from("financial_plans")
        .update({
          estrategia_inicial: estrategia,
          status: novoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", planId);

      if (updateError) {
        console.error("saveEstrategia — Supabase error:", {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
        });
        throw updateError;
      }

      setUltimoSalvo(new Date());
    },
    []
  );

  const salvarEstrategia = saveEstrategia;

  const loadEstrategia = useCallback(
    async (planId: string): Promise<Record<string, unknown> | null> => {
      const { data, error: fetchError } = await supabase
        .from("financial_plans")
        .select("estrategia_inicial")
        .eq("id", planId)
        .single();

      if (fetchError || !data) return null;
      return (data as unknown as { estrategia_inicial: Record<string, unknown> | null })
        .estrategia_inicial;
    },
    []
  );

  // ── Delete ────────────────────────────────────────────────────────────────

  const deletePlan = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from("financial_plans")
      .delete()
      .eq("id", id);
    if (deleteError) throw deleteError;
    setPlan((prev) => (prev?.id === id ? null : prev));
  }, []);

  return {
    plan,
    planRef,
    loading,
    saving,
    error,
    ultimoSalvo,
    carregarPlano,
    criarPlano,
    savePlan,
    salvarPlano,
    saveEstrategia,
    salvarEstrategia,
    loadEstrategia,
    deletePlan,
  };
}
