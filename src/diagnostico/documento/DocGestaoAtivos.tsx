import type { Lead } from "../types";
import { ATIVOS_INVESTIMENTO } from "../ativosInvestimento";
import { DOC, TEXTO_CORPO } from "@/lib/documentoStyles";
import { PaginaDoc } from "@/components/estrategia/documento/PaginaDoc";
import { HeaderSecao } from "@/components/estrategia/documento/HeaderSecao";
import { RodapePaginaDiag } from "./RodapePaginaDiag";

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_LABEL = { bom: "Recomendado", neutro: "Neutro", atencao: "Atenção" } as const;
const STATUS_COR   = { bom: "#15803D",     neutro: "#6B7280", atencao: "#B91C1C" } as const;
const STATUS_BG    = { bom: "#DCFCE7",     neutro: "#F3F4F6", atencao: "#FEE2E2" } as const;

type Status = "bom" | "neutro" | "atencao";

interface Props { lead: Lead; }

export function DocGestaoAtivos({ lead }: Props) {
  const ativosMap = lead.dadosColeta.ativosInvestimento ?? {};

  const valorRF     = Number(ativosMap.valorRendaFixa)     || 0;
  const valorRV     = Number(ativosMap.valorRendaVariavel)  || 0;
  const valorExt    = Number(ativosMap.valorExterior)       || 0;
  const valorCripto = Number(ativosMap.valorCripto)         || 0;
  const valorAlt    = Number(ativosMap.valorAlternativos)   || 0;
  const totalPatrimonio = valorRF + valorRV + valorExt + valorCripto + valorAlt;

  const ativosDoLead = ATIVOS_INVESTIMENTO.filter(a => ativosMap[a.id] === true);
  const ativosRuins  = ativosDoLead.filter(a => a.qualidade === "ruim");

  const allClasses: { label: string; valor: number; status: Status }[] = [
    { label: "Renda Fixa",     valor: valorRF,     status: "bom" as Status },
    { label: "Renda Variável", valor: valorRV,     status: "bom" as Status },
    { label: "Exterior",       valor: valorExt,    status: "bom" as Status },
    { label: "Cripto",         valor: valorCripto, status: "neutro" as Status },
    { label: "Alternativos",   valor: valorAlt,    status: "atencao" as Status },
  ];
  const classes = allClasses.filter(c => c.valor > 0);

  return (
    <PaginaDoc rodape={<RodapePaginaDiag nomeCliente={lead.nome} />}>
      <HeaderSecao titulo="Gestão de Ativos" />

      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 20 }}>
        A alocação de ativos é um dos pilares mais importantes de uma estratégia financeira sólida. Uma carteira bem estruturada equilibra crescimento, proteção e liquidez — adaptada ao seu perfil e objetivos de longo prazo.
      </p>

      <div style={{ border: `1px solid ${DOC.linha}`, borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFF" }}>
              <th style={{ textAlign: "left",  padding: "8px 12px", fontSize: 11, color: "#6B7280", fontWeight: 600 }}>Classe de Ativo</th>
              <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, color: "#6B7280", fontWeight: 600 }}>Valor (R$)</th>
              <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, color: "#6B7280", fontWeight: 600 }}>Alocação</th>
              <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, color: "#6B7280", fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "16px 12px", fontSize: 12, color: "#9CA3AF", textAlign: "center" as const }}>
                  Nenhum valor de investimento informado
                </td>
              </tr>
            ) : classes.map((c, i) => {
              const pct = totalPatrimonio > 0
                ? ((c.valor / totalPatrimonio) * 100).toFixed(1)
                : "0.0";
              return (
                <tr key={i} style={{ borderBottom: "0.5px solid #F3F4F6" }}>
                  <td style={{ padding: "8px 12px", fontSize: 12, color: "#111827" }}>{c.label}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12, color: "#111827", textAlign: "right" as const }}>{formatBRL(c.valor)}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12, textAlign: "right" as const, fontWeight: 600, color: "#2563EB" }}>{pct}%</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" as const }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600,
                      color: STATUS_COR[c.status],
                      background: STATUS_BG[c.status],
                      padding: "2px 8px", borderRadius: 99,
                    }}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {classes.length > 0 && (
            <tfoot>
              <tr style={{ background: "#F0F7FF" }}>
                <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "#111827" }}>Total</td>
                <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "#111827", textAlign: "right" as const }}>{formatBRL(totalPatrimonio)}</td>
                <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "#2563EB", textAlign: "right" as const }}>100%</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {ativosRuins.length > 0 && (
        <div style={{
          background: "#FFF5F5", border: "0.5px solid #FCA5A5",
          borderRadius: 8, padding: "12px 16px", marginTop: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#B91C1C", marginBottom: 6 }}>
            ⚠ Produtos não recomendados identificados
          </div>
          <div style={{ fontSize: 11, color: "#374151" }}>
            {ativosRuins.map(a => a.label).join(" · ")}
          </div>
        </div>
      )}
    </PaginaDoc>
  );
}
