import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Client {
  id: string;
  userId: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  dataCriacao: string;
}

export interface Simulation {
  id: string;
  clientId: string;
  dadosInput: Record<string, unknown>;
  resultadosCalc: Record<string, unknown>;
  dataSimulacao: string;
}

export function useClientStore() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setClients([]);
      setSimulations([]);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user!.id)
          .order("data_criacao", { ascending: false });

        if (error) throw error;

        setClients(
          (data ?? []).map((row) => ({
            id: row.id,
            userId: row.user_id,
            nome: row.nome,
            email: row.email,
            telefone: row.telefone,
            dataCriacao: row.data_criacao,
          }))
        );
      } catch (err) {
        console.error("useClientStore: failed to load clients", err);
        setError(err instanceof Error ? err.message : "Erro ao carregar clientes");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const addClient = useCallback(
    async (nome: string, email?: string, telefone?: string): Promise<Client> => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("clients")
        .insert({ user_id: user.id, nome, email: email ?? null, telefone: telefone ?? null })
        .select()
        .single();

      if (error) {
        console.error("useClientStore: addClient failed", error);
        throw error;
      }

      const client: Client = {
        id: data.id,
        userId: data.user_id,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        dataCriacao: data.data_criacao,
      };

      setClients((prev) => [client, ...prev]);
      return client;
    },
    [user]
  );

  const deleteClient = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) {
      console.error("useClientStore: deleteClient failed", error);
      throw error;
    }

    setClients((prev) => prev.filter((c) => c.id !== id));
    setSimulations((prev) => prev.filter((s) => s.clientId !== id));
  }, []);

  const addSimulation = useCallback(
    async (
      clientId: string,
      dadosInput: Record<string, unknown>,
      resultadosCalc: Record<string, unknown>
    ): Promise<Simulation> => {
      const { data, error } = await supabase
        .from("simulations")
        .insert({ client_id: clientId, dados_input: dadosInput, resultados_calc: resultadosCalc })
        .select()
        .single();

      if (error) {
        console.error("useClientStore: addSimulation failed", error);
        throw error;
      }

      const simulation: Simulation = {
        id: data.id,
        clientId: data.client_id,
        dadosInput: data.dados_input as Record<string, unknown>,
        resultadosCalc: data.resultados_calc as Record<string, unknown>,
        dataSimulacao: data.data_simulacao,
      };

      setSimulations((prev) => [simulation, ...prev]);
      return simulation;
    },
    []
  );

  const deleteSimulation = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from("simulations").delete().eq("id", id);

    if (error) {
      console.error("useClientStore: deleteSimulation failed", error);
      throw error;
    }

    setSimulations((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getClientSimulations = useCallback(
    (clientId: string): Simulation[] => {
      return simulations.filter((s) => s.clientId === clientId);
    },
    [simulations]
  );

  return {
    clients,
    simulations,
    loading,
    error,
    addClient,
    deleteClient,
    addSimulation,
    deleteSimulation,
    getClientSimulations,
  };
}
