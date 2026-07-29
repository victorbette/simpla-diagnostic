import type { Lead } from "../types";
import { ATIVOS_INVESTIMENTO } from "../ativosInvestimento";
import { DOC } from "@/lib/documentoStyles";
import { PaginaDoc } from "@/components/estrategia/documento/PaginaDoc";
import { HeaderSecao } from "@/components/estrategia/documento/HeaderSecao";
import { RodapePaginaDiag } from "./RodapePaginaDiag";

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props { lead: Lead; }

export function DocGestaoAtivos({ lead }: Props) {
  const ativosMap = lead.dadosColeta.ativosInvestimento ?? {};
  const nome = lead.nome.split(" ")[0];

  const valorRF     = Number(ativosMap.valorRendaFixa)    || 0;
  const valorRV     = Number(ativosMap.valorRendaVariavel) || 0;
  const valorExt    = Number(ativosMap.valorExterior)      || 0;
  const valorCripto = Number(ativosMap.valorCripto)        || 0;
  const valorAlt    = Number(ativosMap.valorAlternativos)  || 0;
  const totalPatrimonio = valorRF + valorRV + valorExt + valorCripto + valorAlt;

  const ativosDoLead = ATIVOS_INVESTIMENTO.filter(a => ativosMap[a.id] === true);
  const ativosRuins  = ativosDoLead.filter(a => a.qualidade === "ruim");

  const texto = `A forma como você investe define muito mais do que o retorno do seu dinheiro. Ela define o ritmo com que você se aproxima — ou se afasta — da vida que você quer construir.

A maioria das pessoas investe de forma reativa: aplica onde ouviu falar, coloca onde o gerente indicou, concentra onde sempre colocou. Sem estratégia, sem clareza sobre o papel de cada ativo, sem saber o que fazer quando o mercado cai ou quando surge uma oportunidade. E é exatamente essa falta de direção que faz com que carteiras fiquem estagnadas por anos — rendendo abaixo do potencial, carregando produtos inadequados, pagando taxas que não deveriam existir.

A tabela abaixo mostra a composição atual da sua carteira. Ela é o retrato fiel de onde o seu patrimônio está alocado hoje — e o ponto de partida para uma estratégia que faça cada real trabalhar de forma mais inteligente.

Uma alocação bem definida não é apenas sobre maximizar retorno. É sobre ter clareza em qualquer cenário: quando o mercado sobe, você sabe o que fazer. Quando o mercado cai, você sabe o que fazer. Quando sobra dinheiro para investir, você sabe exatamente onde alocar. Essa clareza tem um valor que vai muito além dos números — ela elimina as decisões por impulso, o medo de errar e a paralisia que faz as pessoas ficarem paradas enquanto o tempo passa.

Mais do que isso: uma carteira bem estruturada trabalha enquanto você dorme. Ela combina ativos que protegem, ativos que crescem e ativos que geram renda — de forma que, ao longo dos anos, o efeito dos juros compostos amplifique cada decisão certa que foi tomada hoje.

${nome}, o próximo passo é transformar essa fotografia atual em uma estratégia. Uma alocação que reflita o seu momento de vida, o seu perfil e os seus objetivos — e que te dê a clareza necessária para agir com convicção, independente do que o mercado fizer.`;

  const allClasses: { label: string; valor: number }[] = [
    { label: "Renda Fixa",     valor: valorRF     },
    { label: "Renda Variável", valor: valorRV     },
    { label: "Exterior",       valor: valorExt    },
    { label: "Cripto",         valor: valorCripto },
    { label: "Alternativos",   valor: valorAlt    },
  ];
  const classes = allClasses.filter(c => c.valor > 0);

  return (
    <PaginaDoc rodape={<RodapePaginaDiag nomeCliente={lead.nome} />}>
      <HeaderSecao titulo="Gestão de Ativos" />

      {/* Texto explicativo */}
      <p style={{
        fontSize: 12, color: "#374151", lineHeight: 2,
        marginBottom: 20, whiteSpace: "pre-line" as const,
      }}>
        {texto}
      </p>

      {/* Tabela de alocação */}
      <div style={{ border: `1px solid ${DOC.linha}`, borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFF" }}>
              <th style={{ textAlign: "left",  padding: "8px 12px", fontSize: 11, color: "#6B7280", fontWeight: 600 }}>Classe de Ativo</th>
              <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, color: "#6B7280", fontWeight: 600 }}>Valor (R$)</th>
              <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, color: "#6B7280", fontWeight: 600 }}>Alocação</th>
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "16px 12px", fontSize: 12, color: "#9CA3AF", textAlign: "center" as const }}>
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
