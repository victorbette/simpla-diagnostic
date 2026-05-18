import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Client {
  id: string;
  userId: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf?: string | null;
  dataNascimento?: string | null;
  observacoes?: string | null;
  dataCriacao: string;
  updatedAt?: string | null;
}

export interface Simulation {
  id: string;
  clientId: string;
  dadosInput: Record<string, unknown>;
  resultadosCalc: Record<string, unknown>;
  dataSimulacao: string;
}

function mapRow(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    nome: row.nome as string,
    email: (row.email as string | null) ?? null,
    telefone: (row.telefone as string | null) ?? null,
    cpf: (row.cpf as string | null) ?? null,
    dataNascimento: (row.data_nascimento as string | null) ?? null,
    observacoes: (row.observacoes as string | null) ?? null,
    dataCriacao: row.data_criacao as string,
    updatedAt: (row.updated_at as string | null) ?? null,
  };
}

export function useClientStore() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarClientes = useCallback(async () => {
    if (!user) {
      setClients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .order("data_criacao", { ascending: false });

      if (err) throw err;
      setClients((data ?? []).map((row) => mapRow(row as unknown as Record<string, unknown>)));
    } catch (err) {
      console.error("useClientStore: carregarClientes failed", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  // ── Criar ─────────────────────────────────────────────────────────────────

  const criarCliente = useCallback(
    async (dados: {
      nome: string;
      email?: string;
      telefone?: string;
      cpf?: string;
      dataNascimento?: string;
      observacoes?: string;
    }): Promise<Client> => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error: err } = await supabase
        .from("clients")
        .insert({
          user_id: user.id,
          nome: dados.nome,
          email: dados.email ?? null,
          telefone: dados.telefone ?? null,
          cpf: dados.cpf ?? null,
          data_nascimento: dados.dataNascimento ?? null,
          observacoes: dados.observacoes ?? null,
        })
        .select()
        .single();

      if (err) {
        console.error("useClientStore: criarCliente failed", {
          message: err.message,
          details: err.details,
          hint: err.hint,
          code: err.code,
        });
        throw new Error(err.message);
      }

      const novo = mapRow(data as unknown as Record<string, unknown>);
      setClients((prev) => [novo, ...prev]);
      return novo;
    },
    [user]
  );

  // Alias para compatibilidade com código existente
  const addClient = useCallback(
    (nome: string, email?: string, telefone?: string): Promise<Client> =>
      criarCliente({ nome, email, telefone }),
    [criarCliente]
  );

  // ── Atualizar ─────────────────────────────────────────────────────────────

  const atualizarCliente = useCallback(
    async (
      id: string,
      dados: Partial<Omit<Client, "id" | "userId" | "dataCriacao">>
    ): Promise<void> => {
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (dados.nome !== undefined) payload.nome = dados.nome;
      if (dados.email !== undefined) payload.email = dados.email;
      if (dados.telefone !== undefined) payload.telefone = dados.telefone;
      if (dados.cpf !== undefined) payload.cpf = dados.cpf;
      if (dados.dataNascimento !== undefined) payload.data_nascimento = dados.dataNascimento;
      if (dados.observacoes !== undefined) payload.observacoes = dados.observacoes;

      const { error: err } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", id);

      if (err) {
        console.error("useClientStore: atualizarCliente failed", {
          message: err.message,
          details: err.details,
          hint: err.hint,
          code: err.code,
        });
        throw new Error(err.message);
      }

      setClients((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...dados } : c))
      );
    },
    []
  );

  // ── Deletar ───────────────────────────────────────────────────────────────

  const deletarCliente = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from("clients").delete().eq("id", id);

    if (err) {
      console.error("useClientStore: deletarCliente failed", err);
      throw new Error(err.message);
    }

    setClients((prev) => prev.filter((c) => c.id !== id));
    setSimulations((prev) => prev.filter((s) => s.clientId !== id));
  }, []);

  // Alias para compatibilidade
  const deleteClient = deletarCliente;

  // ── Simulações ────────────────────────────────────────────────────────────

  const addSimulation = useCallback(
    async (
      clientId: string,
      dadosInput: Record<string, unknown>,
      resultadosCalc: Record<string, unknown>
    ): Promise<Simulation> => {
      const { data, error: err } = await supabase
        .from("simulations")
        .insert({ client_id: clientId, dados_input: dadosInput, resultados_calc: resultadosCalc })
        .select()
        .single();

      if (err) {
        console.error("useClientStore: addSimulation failed", err);
        throw err;
      }

      const sim: Simulation = {
        id: data.id,
        clientId: data.client_id,
        dadosInput: data.dados_input as Record<string, unknown>,
        resultadosCalc: data.resultados_calc as Record<string, unknown>,
        dataSimulacao: data.data_simulacao,
      };

      setSimulations((prev) => [sim, ...prev]);
      return sim;
    },
    []
  );

  const deleteSimulation = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from("simulations").delete().eq("id", id);
    if (err) throw err;
    setSimulations((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getClientSimulations = useCallback(
    (clientId: string): Simulation[] =>
      simulations.filter((s) => s.clientId === clientId),
    [simulations]
  );

  return {
    clients,
    simulations,
    loading,
    error,
    carregarClientes,
    criarCliente,
    atualizarCliente,
    deletarCliente,
    addClient,
    deleteClient,
    addSimulation,
    deleteSimulation,
    getClientSimulations,
  };
}
