import { useMemo, useState } from "react";
import type { Ativo, CardId } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";
import {
  calcularRecomendacao, paraAlocacaoMeta, paraAtivosRecomendados,
} from "@/lib/carteira/alocacaoSimpla";
import { useAllocationModel } from "@/hooks/useAllocationModel";

interface Props {
  clientProfile: string | null;
  patrimonioMeta: number;                       // patrimônio + aporte
  temAtivosRecomendados: boolean;
  onAplicar: (meta: Record<CardId, number>, ativos: Ativo[]) => void;
}

function parseBRL(raw: string): number {
  const clean = raw.replace(/[R$\s.]/g, "").replace(",", ".");
  const v = parseFloat(clean);
  return isNaN(v) || v < 0 ? 0 : v;
}

/**
 * Painel "Recomendação Simpla" — replica o Painel da planilha de alocação:
 * detecta a faixa pelo patrimônio, desconta a reserva de emergência e aplica
 * a matriz faixa × perfil + produtos recomendados nos cards da Etapa 2.
 */
export function PainelRecomendacaoSimpla({ clientProfile, patrimonioMeta, temAtivosRecomendados, onAplicar }: Props) {
  const { model, loading, error, syncing, sincronizar } = useAllocationModel();
  const [custoVidaText, setCustoVidaText] = useState("");
  const [mesesReserva, setMesesReserva] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const custoVidaMensal = parseBRL(custoVidaText);

  const rec = useMemo(() => {
    if (!model || !clientProfile || patrimonioMeta <= 0) return null;
    return calcularRecomendacao(model, {
      patrimonioTotal: patrimonioMeta,
      perfil: clientProfile,
      custoVidaMensal,
      mesesReserva,
    });
  }, [model, clientProfile, patrimonioMeta, custoVidaMensal, mesesReserva]);

  function aplicar() {
    if (!rec?.ok) return;
    if (temAtivosRecomendados && !window.confirm(
      "Aplicar a recomendação Simpla vai substituir os ativos recomendados já lançados. Continuar?",
    )) return;
    onAplicar(paraAlocacaoMeta(rec, patrimonioMeta), paraAtivosRecomendados(rec));
    setMsg({ ok: true, texto: "Recomendação aplicada aos cards abaixo." });
  }

  async function handleSync() {
    setMsg(null);
    const r = await sincronizar();
    setMsg({ ok: r.ok, texto: r.mensagem });
  }

  const dataModelo = model
    ? new Date(model.publishedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <div style={{ backgroundColor: "white", border: "0.5px solid #BFDBFE", borderRadius: 12, padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Recomendação Simpla</span>
          {rec?.ok && (
            <span style={{ backgroundColor: "#DBEAFE", color: "#1E40AF", fontSize: 11, padding: "2px 8px", borderRadius: 999 }}>
              {rec.faixa}
            </span>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          title="Reimporta a planilha de alocação do Google Sheets"
          style={{
            fontSize: 11, color: "#6B7280", background: "#F9FAFB",
            border: "0.5px solid #E5E7EB", borderRadius: 6, padding: "4px 10px",
            cursor: syncing ? "default" : "pointer", opacity: syncing ? 0.5 : 1,
            display: "flex", alignItems: "center", gap: 5,
          }}
        >
          <i className={`ti ${syncing ? "ti-loader-2" : "ti-refresh"}`} style={{ fontSize: 13 }} />
          {syncing ? "Sincronizando…" : "Sincronizar planilha"}
        </button>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "#6B7280" }}>
        Alocação ideal por faixa de patrimônio e perfil, conforme a planilha oficial
        {dataModelo ? ` (modelo de ${dataModelo})` : ""}.
      </p>

      {/* Estados sem modelo */}
      {loading && <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF" }}>Carregando modelo de alocação…</p>}
      {!loading && error && (
        <p style={{ margin: 0, fontSize: 12, color: "#B91C1C" }}>Erro ao carregar o modelo: {error}</p>
      )}
      {!loading && !error && !model && (
        <p style={{ margin: 0, fontSize: 12, color: "#B45309" }}>
          Nenhuma versão da planilha sincronizada ainda — use "Sincronizar planilha" acima.
        </p>
      )}

      {model && (
        <>
          {/* Reserva de emergência (Painel da planilha) */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
            padding: "12px 0", borderTop: "0.5px solid #F3F4F6",
          }}>
            <div>
              <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>
                Custo de vida mensal
              </label>
              <input
                type="text"
                value={custoVidaText}
                placeholder="R$ 0,00"
                onChange={(e) => setCustoVidaText(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={() => setCustoVidaText(custoVidaMensal > 0 ? formatBRL(custoVidaMensal) : "")}
                style={{
                  width: "100%", fontSize: 13, border: "1px solid #E5E7EB", borderRadius: 6,
                  padding: "6px 10px", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>
                Meses de reserva
              </label>
              <input
                type="number"
                min={0}
                max={36}
                value={mesesReserva}
                onChange={(e) => setMesesReserva(Math.max(0, parseInt(e.target.value) || 0))}
                style={{
                  width: "100%", fontSize: 13, border: "1px solid #E5E7EB", borderRadius: 6,
                  padding: "6px 10px", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <span style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>
                Reserva de emergência
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: "31px" }}>
                {rec?.ok ? formatBRL(rec.reservaEmergencia) : formatBRL(custoVidaMensal * mesesReserva)}
              </span>
            </div>
          </div>

          {/* Resumo + aplicar */}
          {rec && !rec.ok && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#FEF3C7", border: "0.5px solid #FCD34D",
              borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#B45309",
            }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 14, flexShrink: 0 }} />
              {rec.mensagem}
            </div>
          )}
          {rec?.ok && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, paddingTop: 4,
            }}>
              <span style={{ fontSize: 12, color: "#6B7280" }}>
                Patrimônio investido: <strong style={{ color: "#111827" }}>{formatBRL(rec.patrimonioInvestido)}</strong>
                {rec.reservaEmergencia > 0 && " · reserva somada ao Resgate Rápido"}
              </span>
              <button
                onClick={aplicar}
                style={{
                  fontSize: 12, fontWeight: 600, color: "white", background: "#2563EB",
                  border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer",
                }}
              >
                Aplicar recomendação
              </button>
            </div>
          )}
          {!clientProfile && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#B45309" }}>
              Defina o perfil de suitability do cliente para gerar a recomendação.
            </p>
          )}
        </>
      )}

      {msg && (
        <p style={{ margin: "10px 0 0", fontSize: 12, color: msg.ok ? "#15803D" : "#B91C1C" }}>
          {msg.texto}
        </p>
      )}
    </div>
  );
}
