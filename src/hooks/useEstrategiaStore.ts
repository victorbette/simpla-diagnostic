import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { EstrategiaInicial } from "@/types/estrategiaInicial";

// ─── Row shape returned by Supabase ──────────────────────────────────────────

interface EstrategiaRow {
  id: string;
  client_id: string;
  financial_plan_id: string | null;
  logo_base64: string | null;
  apresentacao: string;
  nome_assessor: string;
  secoes: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}

function rowToEstrategia(row: EstrategiaRow): EstrategiaInicial {
  return {
    id: row.id,
    clientId: row.client_id,
    financialPlanId: row.financial_plan_id ?? undefined,
    logoBase64: row.logo_base64 ?? undefined,
    apresentacao: row.apresentacao,
    nomeAssessor: row.nome_assessor,
    secoes: row.secoes as unknown as EstrategiaInicial["secoes"],
    status: row.status as EstrategiaInicial["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEstrategiaStore() {
  const { user } = useAuth();
  const [estrategias, setEstrategias] = useState<EstrategiaInicial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setEstrategias([]);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from("estrategias_iniciais")
          .select("*, clients!inner(user_id)")
          .eq("clients.user_id", user!.id)
          .order("updated_at", { ascending: false });

        if (fetchError) throw fetchError;
        setEstrategias(
          (data ?? []).map((row) => rowToEstrategia(row as unknown as EstrategiaRow))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar estratégias");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const saveEstrategia = useCallback(
    async (e: EstrategiaInicial): Promise<EstrategiaInicial> => {
      const payload = {
        client_id: e.clientId,
        financial_plan_id: e.financialPlanId ?? null,
        logo_base64: e.logoBase64 ?? null,
        apresentacao: e.apresentacao,
        nome_assessor: e.nomeAssessor,
        secoes: e.secoes as unknown as Record<string, unknown>,
        status: e.status,
        updated_at: new Date().toISOString(),
      };

      try {
        if (e.id) {
          const { data, error: updateError } = await supabase
            .from("estrategias_iniciais")
            .update(payload)
            .eq("id", e.id)
            .select()
            .single();

          if (updateError) throw updateError;

          const updated = rowToEstrategia(data as unknown as EstrategiaRow);
          setEstrategias((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          );
          return updated;
        } else {
          const { data, error: insertError } = await supabase
            .from("estrategias_iniciais")
            .insert(payload)
            .select()
            .single();

          if (insertError) throw insertError;

          const created = rowToEstrategia(data as unknown as EstrategiaRow);
          setEstrategias((prev) => [created, ...prev]);
          return created;
        }
      } catch (err) {
        throw err;
      }
    },
    []
  );

  const deleteEstrategia = useCallback(async (id: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from("estrategias_iniciais")
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;
      setEstrategias((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      throw err;
    }
  }, []);

  const getClientEstrategias = useCallback(
    (clientId: string): EstrategiaInicial[] => {
      return estrategias
        .filter((e) => e.clientId === clientId)
        .sort(
          (a, b) =>
            new Date(b.updatedAt ?? 0).getTime() -
            new Date(a.updatedAt ?? 0).getTime()
        );
    },
    [estrategias]
  );

  return {
    estrategias,
    loading,
    error,
    saveEstrategia,
    deleteEstrategia,
    getClientEstrategias,
  };
}
