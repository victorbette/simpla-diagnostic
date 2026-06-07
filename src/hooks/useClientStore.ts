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
  // Plan summary — populated via join, defaults to "no plan"
  planId: string | null;
  planStatus: "nao_iniciado" | "rascunho" | "completo";
  planUpdatedAt: string | null;
  planSuitabilityPerfil: string | null;
  planDadosCliente: Record<string, unknown> | null;
  planPlanejamentoIF: Record<string, unknown> | null;
  planFiscal: Record<string, unknown> | null;
  planSucessorio: Record<string, unknown> | null;
  planEstrategia: Record<string, unknown> | null;
}

export interface Simulation {
  id: string;
  clientId: string;
  dadosInput: Record<string, unknown>;
  resultadosCalc: Record<string, unknown>;
  dataSimulacao: string;
}

// ── Module-level cache (persists across remounts) ─────────────────────────────

const cache = new Map<string, { data: Client[]; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

function mapRow(row: Record<string, unknown>): Client {
  const plans = (row.financial_plans as Array<Record<string, unknown>> | null) ?? [];
  const plan = plans[0] ?? null;
  const suitability = plan?.suitability as Record<string, unknown> | null | undefined;
  const dadosClienteRaw = plan?.dados_cliente as Record<string, unknown> | null | undefined;

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
    planId: (plan?.id as string | null) ?? null,
    planStatus: ((plan?.status as string) ?? "nao_iniciado") as Client["planStatus"],
    planUpdatedAt: (plan?.updated_at as string | null) ?? null,
    planSuitabilityPerfil:
      (dadosClienteRaw?.suitabilityPerfil as string | null)
      ?? (suitability?.perfil as string | null)
      ?? null,
    planDadosCliente: dadosClienteRaw ?? null,
    planPlanejamentoIF: (plan?.planejamento_if as Record<string, unknown> | null | undefined) ?? null,
    planFiscal: (plan?.fiscal as Record<string, unknown> | null | undefined) ?? null,
    planSucessorio: (plan?.sucessorio as Record<string, unknown> | null | undefined) ?? null,
    planEstrategia: (plan?.estrategia_inicial as Record<string, unknown> | null | undefined) ?? null,
  };
}

export function useClientStore() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarClientes = useCallback(
    async (forceRefresh = false) => {
      if (!user) {
        setClients([]);
        setLoading(false);
        return;
      }

      const agora = Date.now();
      const cached = cache.get(user.id);

      // Serve from cache if fresh and not forcing refresh
      if (!forceRefresh && cached && agora - cached.ts < CACHE_TTL) {
        setClients(cached.data);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Single query — clients + plan summary via join (eliminates N+1)
        const { data, error: err } = await supabase
          .from("clients")
          .select(`
            id, user_id, nome, email, telefone, cpf,
            data_nascimento, observacoes, data_criacao, updated_at,
            financial_plans ( id, status, updated_at, suitability, dados_cliente, planejamento_if, fiscal, sucessorio, estrategia_inicial )
          `)
          .eq("user_id", user.id)
          .order("data_criacao", { ascending: false });

        if (err) throw err;

        const result = (data ?? []).map((row) =>
          mapRow(row as unknown as Record<string, unknown>)
        );

        cache.set(user.id, { data: result, ts: Date.now() });
        setClients(result);
      } catch (err) {
        console.error("useClientStore: carregarClientes failed", err);
        setError(err instanceof Error ? err.message : "Erro ao carregar clientes");
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  // Invalidate cache for this user
  const invalidateCache = useCallback(() => {
    if (user) cache.delete(user.id);
  }, [user]);

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

      const novo: Client = {
        ...mapRow(data as unknown as Record<string, unknown>),
        planId: null,
        planStatus: "nao_iniciado",
        planUpdatedAt: null,
        planSuitabilityPerfil: null,
        planDadosCliente: null,
        planPlanejamentoIF: null,
        planFiscal: null,
        planSucessorio: null,
        planEstrategia: null,
      };

      invalidateCache();
      setClients((prev) => [novo, ...prev]);
      return novo;
    },
    [user, invalidateCache]
  );

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

      invalidateCache();
      setClients((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...dados } : c))
      );
    },
    [invalidateCache]
  );

  // ── Deletar ───────────────────────────────────────────────────────────────

  const deletarCliente = useCallback(
    async (id: string): Promise<void> => {
      const { error: err } = await supabase.from("clients").delete().eq("id", id);

      if (err) {
        console.error("useClientStore: deletarCliente failed", err);
        throw new Error(err.message);
      }

      invalidateCache();
      setClients((prev) => prev.filter((c) => c.id !== id));
      setSimulations((prev) => prev.filter((s) => s.clientId !== id));
    },
    [invalidateCache]
  );

  const deleteClient = deletarCliente;

  // ── Método chamado após salvar um plan — atualiza planStatus em memória ───

  const updateClientPlanStatus = useCallback(
    (clientId: string, planId: string, status: Client["planStatus"]) => {
      invalidateCache();
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? { ...c, planId, planStatus: status, planUpdatedAt: new Date().toISOString() }
            : c
        )
      );
    },
    [invalidateCache]
  );

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
    updateClientPlanStatus,
    addClient,
    deleteClient,
    addSimulation,
    deleteSimulation,
    getClientSimulations,
  };
}
