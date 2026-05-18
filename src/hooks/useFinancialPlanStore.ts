import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

// ─── Row shape returned by Supabase ──────────────────────────────────────────

interface PlanRow {
  id: string;
  client_id: string;
  suitability: Record<string, unknown> | null;
  ativos_atuais: Record<string, unknown>;
  alocacao_personalizada: Record<string, unknown> | null;
  planejamento_if: Record<string, unknown>;
  protecao: Record<string, unknown>;
  fiscal: Record<string, unknown>;
  sucessorio: Record<string, unknown>;
  notas_assessor: string;
  dados_cliente: Record<string, unknown> | null;
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
    alocacaoPersonalizada:
      (row.alocacao_personalizada as unknown as MacroalocacaoAlvo) ?? null,
    planejamentoIF: row.planejamento_if as unknown as PlanejamentoIF,
    protecao: row.protecao as unknown as ProtecaoSimplificada,
    fiscal: row.fiscal as unknown as PlanejamentoFiscal,
    sucessorio: row.sucessorio as unknown as PlanejamentoSucessorio,
    notasConsultor: row.notas_assessor,
    status: row.status as FinancialPlan["status"],
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFinancialPlanStore() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<FinancialPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPlans([]);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from("financial_plans")
          .select("*, clients!inner(user_id)")
          .eq("clients.user_id", user!.id)
          .order("updated_at", { ascending: false });

        if (fetchError) throw fetchError;
        setPlans((data ?? []).map((row) => rowToPlan(row as unknown as PlanRow)));
      } catch (err) {
        console.error("useFinancialPlanStore: failed to load plans", err);
        setError(err instanceof Error ? err.message : "Erro ao carregar planos");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const savePlan = useCallback(
    async (plan: FinancialPlan): Promise<FinancialPlan> => {
      const payload = {
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

      try {
        if (plan.id) {
          const { data, error: updateError } = await supabase
            .from("financial_plans")
            .update(payload)
            .eq("id", plan.id)
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
          setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
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
          setPlans((prev) => [created, ...prev]);
          return created;
        }
      } catch (err) {
        console.error("useFinancialPlanStore: savePlan failed", err);
        throw err;
      }
    },
    []
  );

  // ── Estratégia Inicial ────────────────────────────────────────────────────

  const saveEstrategia = useCallback(
    async (planId: string, estrategia: Record<string, unknown>): Promise<void> => {
      const { error: updateError } = await supabase
        .from("financial_plans")
        .update({
          estrategia_inicial: estrategia,
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
    },
    []
  );

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

  // ── Misc ─────────────────────────────────────────────────────────────────

  const deletePlan = useCallback(async (id: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from("financial_plans")
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("useFinancialPlanStore: deletePlan failed", err);
      throw err;
    }
  }, []);

  const getClientPlans = useCallback(
    (clientId: string): FinancialPlan[] => {
      return plans
        .filter((p) => p.clientId === clientId)
        .sort(
          (a, b) =>
            new Date(b.updatedAt ?? 0).getTime() -
            new Date(a.updatedAt ?? 0).getTime()
        );
    },
    [plans]
  );

  const getLatestPlan = useCallback(
    (clientId: string): FinancialPlan | undefined => {
      return getClientPlans(clientId)[0];
    },
    [getClientPlans]
  );

  return {
    plans,
    loading,
    error,
    savePlan,
    saveEstrategia,
    loadEstrategia,
    deletePlan,
    getClientPlans,
    getLatestPlan,
  };
}
