import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DiagnosticRecord {
  id: string;
  clientId: string;
  createdAt: string;
  answers: Record<string, unknown>;
  result: Record<string, unknown>;
  linkedSimulationId: string | null;
}

export function useDiagnosticStore() {
  const { user } = useAuth();
  const [records, setRecords] = useState<DiagnosticRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        // Join through clients to enforce RLS ownership check on the query side too
        const { data, error } = await supabase
          .from("diagnostics")
          .select("*, clients!inner(user_id)")
          .eq("clients.user_id", user!.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setRecords(
          (data ?? []).map((row) => ({
            id: row.id,
            clientId: row.client_id,
            createdAt: row.created_at,
            answers: row.answers as Record<string, unknown>,
            result: row.result as Record<string, unknown>,
            linkedSimulationId: row.linked_simulation_id,
          }))
        );
      } catch (err) {
        console.error("useDiagnosticStore: failed to load diagnostics", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const saveDiagnostic = useCallback(
    async (
      clientId: string,
      answers: Record<string, unknown>,
      result: Record<string, unknown>,
      linkedSimulationId?: string
    ): Promise<DiagnosticRecord> => {
      const { data, error } = await supabase
        .from("diagnostics")
        .insert({
          client_id: clientId,
          answers,
          result,
          linked_simulation_id: linkedSimulationId ?? null,
        })
        .select()
        .single();

      if (error) {
        console.error("useDiagnosticStore: saveDiagnostic failed", error);
        throw error;
      }

      const record: DiagnosticRecord = {
        id: data.id,
        clientId: data.client_id,
        createdAt: data.created_at,
        answers: data.answers as Record<string, unknown>,
        result: data.result as Record<string, unknown>,
        linkedSimulationId: data.linked_simulation_id,
      };

      setRecords((prev) => [record, ...prev]);
      return record;
    },
    []
  );

  const deleteDiagnostic = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from("diagnostics").delete().eq("id", id);

    if (error) {
      console.error("useDiagnosticStore: deleteDiagnostic failed", error);
      throw error;
    }

    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const getClientDiagnostics = useCallback(
    (clientId: string): DiagnosticRecord[] => {
      return records
        .filter((r) => r.clientId === clientId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    [records]
  );

  return {
    records,
    loading,
    saveDiagnostic,
    deleteDiagnostic,
    getClientDiagnostics,
  };
}
