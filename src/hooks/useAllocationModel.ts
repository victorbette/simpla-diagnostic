import { useCallback, useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AllocationModel } from "@/lib/carteira/alocacaoSimpla";

interface State {
  model: AllocationModel | null;
  loading: boolean;
  error: string | null;
}

async function fetchLatestModel(): Promise<AllocationModel | null> {
  const { data: version, error: verErr } = await supabase
    .from("allocation_versions")
    .select("id, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (verErr) throw verErr;
  if (!version) return null;

  const [bands, matrix, products, prices] = await Promise.all([
    supabase.from("allocation_bands").select("nome, min_patrimonio, ordem").eq("version_id", version.id).order("ordem"),
    supabase.from("allocation_matrix").select("faixa, perfil, classe, pct").eq("version_id", version.id),
    supabase.from("allocation_products").select("faixa, perfil, classe, nome, is_fundo, ordem").eq("version_id", version.id),
    supabase.from("asset_prices").select("ticker, classe, preco_teto, preco_hoje").eq("version_id", version.id),
  ]);
  const firstError = bands.error ?? matrix.error ?? products.error ?? prices.error;
  if (firstError) throw firstError;

  return {
    versionId: version.id,
    publishedAt: version.published_at,
    bands: bands.data ?? [],
    matrix: matrix.data ?? [],
    products: products.data ?? [],
    prices: prices.data ?? [],
  };
}

/**
 * Carrega a última versão publicada do modelo de alocação (planilha sincronizada
 * no Supabase). `sincronizar()` invoca a Edge Function sync-allocation e
 * recarrega o modelo se uma nova versão foi publicada.
 */
export function useAllocationModel() {
  const [state, setState] = useState<State>({ model: null, loading: true, error: null });
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const model = await fetchLatestModel();
      setState({ model, loading: false, error: null });
    } catch (err) {
      setState({ model: null, loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const sincronizar = useCallback(async (): Promise<{ ok: boolean; mensagem: string }> => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-allocation", { method: "POST" });
      if (error) {
        // non-2xx vem como FunctionsHttpError; o corpo JSON traz a causa real
        if (error instanceof FunctionsHttpError) {
          const body = await error.context.json().catch(() => null);
          const detalhe = body?.error ?? body?.fatais?.[0] ?? error.message;
          throw new Error(detalhe);
        }
        throw error;
      }
      if (data?.status === "rejected") {
        return { ok: false, mensagem: `Planilha rejeitada: ${data.fatais?.[0] ?? "erro de validação"}` };
      }
      if (data?.status === "published") await reload();
      return {
        ok: true,
        mensagem: data?.status === "unchanged" ? "Planilha já está atualizada." : "Planilha sincronizada.",
      };
    } catch (err) {
      return { ok: false, mensagem: err instanceof Error ? err.message : String(err) };
    } finally {
      setSyncing(false);
    }
  }, [reload]);

  return { ...state, syncing, reload, sincronizar };
}
