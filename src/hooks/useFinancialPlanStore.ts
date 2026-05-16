import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  FinancialPlan,
  PerfilPessoal,
  Patrimonio,
  ObjetivoVida,
  Protecao,
  Sucessao,
  Cambio,
  LiberdadeFinanceira,
} from "@/types/financialPlanning";

// ─── Row shape returned by Supabase ──────────────────────────────────────────

interface PlanRow {
  id: string;
  client_id: string;
  perfil: Record<string, unknown>;
  patrimonio: Record<string, unknown>;
  objetivos: unknown[];
  protecao: Record<string, unknown>;
  sucessao: Record<string, unknown>;
  cambio: Record<string, unknown>;
  liberdade_financeira: Record<string, unknown>;
  notas: string;
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
    perfil: row.perfil as unknown as PerfilPessoal,
    patrimonio: row.patrimonio as unknown as Patrimonio,
    objetivos: row.objetivos as ObjetivoVida[],
    protecao: row.protecao as unknown as Protecao,
    sucessao: row.sucessao as unknown as Sucessao,
    cambio: row.cambio as unknown as Cambio,
    liberdadeFinanceira: row.liberdade_financeira as unknown as LiberdadeFinanceira,
    notas: row.notas,
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
        const { data, error } = await supabase
          .from("financial_plans")
          .select("*, clients!inner(user_id)")
          .eq("clients.user_id", user!.id)
          .order("updated_at", { ascending: false });

        if (error) throw error;
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
    async (
      clientId: string,
      plan: Partial<FinancialPlan> & { id?: string }
    ): Promise<FinancialPlan> => {
      const payload = {
        client_id: clientId,
        perfil: (plan.perfil ?? {}) as unknown as Record<string, unknown>,
        patrimonio: (plan.patrimonio ?? {}) as unknown as Record<string, unknown>,
        objetivos: (plan.objetivos ?? []) as unknown[],
        protecao: (plan.protecao ?? {}) as unknown as Record<string, unknown>,
        sucessao: (plan.sucessao ?? {}) as unknown as Record<string, unknown>,
        cambio: (plan.cambio ?? {}) as unknown as Record<string, unknown>,
        liberdade_financeira: (plan.liberdadeFinanceira ?? {}) as unknown as Record<string, unknown>,
        notas: plan.notas ?? "",
        status: plan.status ?? "rascunho",
        updated_at: new Date().toISOString(),
      };

      try {
        if (plan.id) {
          // Update
          const { data, error } = await supabase
            .from("financial_plans")
            .update(payload)
            .eq("id", plan.id)
            .select()
            .single();

          if (error) throw error;

          const updated = rowToPlan(data as unknown as PlanRow);
          setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          return updated;
        } else {
          // Insert
          const { data, error } = await supabase
            .from("financial_plans")
            .insert(payload)
            .select()
            .single();

          if (error) throw error;

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

  const deletePlan = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from("financial_plans").delete().eq("id", id);
      if (error) throw error;
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
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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
    deletePlan,
    getClientPlans,
    getLatestPlan,
  };
}
