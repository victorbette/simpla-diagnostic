import type { Lead } from "../types";
import { ATIVOS_INVESTIMENTO } from "../ativosInvestimento";
import { ATIVOS_TEXTOS } from "../ativosTextos";
import { DOC } from "@/lib/documentoStyles";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props { lead: Lead; }

export function DocGestaoAtivos({ lead }: Props) {
  const ativosMap = lead.dadosColeta.ativosInvestimento ?? {};

  const valorRF     = Number(ativosMap.valorRendaFixa)    || 0;
  const valorRV     = Number(ativosMap.valorRendaVariavel) || 0;
  const valorExt    = Number(ativosMap.valorExterior)      || 0;
  const valorCripto = Number(ativosMap.valorCripto)        || 0;
  const valorAlt    = Number(ativosMap.valorAlternativos)  || 0;
  const totalPatrimonio = valorRF + valorRV + valorExt + valorCripto + valorAlt;

  const ativosDoLead = ATIVOS_INVESTIMENTO.filter(a => ativosMap[a.id] === true);
  const ativosBons   = ativosDoLead.filter(a => a.qualidade === "bom");
  const ativosRuins  = ativosDoLead.filter(a => a.qualidade === "ruim");

  const texto = `A forma como você investe define muito mais do que o retorno do seu dinheiro. Ela define o ritmo com que você se aproxima — ou se afasta — da vida que você quer construir.

A maioria das pessoas investe de forma reativa: aplica onde ouviu falar, coloca onde o gerente indicou, concentra onde sempre colocou. Sem estratégia, sem clareza sobre o papel de cada ativo, sem saber o que fazer quando o mercado cai ou quando surge uma oportunidade. E é exatamente essa falta de direção que faz com que carteiras fiquem estagnadas por anos — rendendo abaixo do potencial, carregando produtos inadequados, pagando taxas que não deveriam existir.

A tabela abaixo mostra a composição atual da sua carteira. Ela é o retrato fiel de onde o seu patrimônio está alocado hoje — e o ponto de partida para uma estratégia que faça cada real trabalhar de forma mais inteligente.

Uma alocação bem definida não é apenas sobre maximizar retorno. É sobre ter clareza em qualquer cenário: quando o mercado sobe, você sabe o que fazer. Quando o mercado cai, você sabe o que fazer. Quando sobra dinheiro para investir, você sabe exatamente onde alocar. Essa clareza tem um valor que vai muito além dos números — ela elimina as decisões por impulso, o medo de errar e a paralisia que faz as pessoas ficarem paradas enquanto o tempo passa.

Mais do que isso: uma carteira bem estruturada trabalha enquanto você dorme. Ela combina ativos que protegem, ativos que crescem e ativos que geram renda — de forma que, ao longo dos anos, o efeito dos juros compostos amplifique cada decisão certa que foi tomada hoje.
`;

  const allClasses: { label: string; valor: number }[] = [
    { label: "Renda Fixa",     valor: valorRF     },
    { label: "Renda Variável", valor: valorRV     },
    { label: "Exterior",       valor: valorExt    },
    { label: "Cripto",         valor: valorCripto },
    { label: "Alternativos",   valor: valorAlt    },
  ];
  const classes = allClasses.filter(c => c.valor > 0);

  const blocos: BlocoDoc[] = [];

  blocos.push({
    chave: "intro",
    node: (
      <p style={{
        fontSize: 12, color: "#374151", lineHeight: 2,
        marginBottom: 20, whiteSpace: "pre-line" as const,
      }}>
        {texto}
      </p>
    ),
  });

  if (ativosBons.length > 0) {
    blocos.push({
      chave: "bons",
      node: (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: "#15803D", marginBottom: 10,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <i className="ti ti-circle-check" style={{ fontSize: 14 }} />
            O que você já faz bem
          </div>
          {ativosBons.map(ativo => {
            const textoAtivo = ATIVOS_TEXTOS[ativo.id];
            if (!textoAtivo?.positivo) return null;
            return (
              <div key={ativo.id} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: "2px solid #BBF7D0" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#111827", marginBottom: 3 }}>
                  {ativo.label}
                </div>
                <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                  {textoAtivo.positivo.replace(/\n\s+/g, " ").trim()}
                </p>
              </div>
            );
          })}
        </div>
      ),
    });
  }

  if (ativosRuins.length > 0) {
    blocos.push({
      chave: "ruins",
      node: (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: "#B91C1C", marginBottom: 10,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 14 }} />
            Pontos que merecem atenção
          </div>
          {ativosRuins.map(ativo => {
            const textoAtivo = ATIVOS_TEXTOS[ativo.id];
            if (!textoAtivo?.negativo) return null;
            return (
              <div key={ativo.id} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: "2px solid #FCA5A5" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#111827", marginBottom: 3 }}>
                  {ativo.label}
                </div>
                <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                  {textoAtivo.negativo.replace(/\n\s+/g, " ").trim()}
                </p>
              </div>
            );
          })}
        </div>
      ),
    });
  }

  blocos.push({
    chave: "tabela",
    node: (
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
    ),
  });

  if (ativosDoLead.length === 0) {
    blocos.push({
      chave: "aviso",
      node: (
        <div style={{
          background: "#FFF7ED", border: "0.5px solid #FCD34D",
          borderRadius: 8, padding: "12px 16px", marginTop: 12,
          fontSize: 12, color: "#92400E",
        }}>
          Nenhum investimento foi mapeado na coleta de dados. A análise de alocação será realizada na reunião inicial.
        </div>
      ),
    });
  }

  return (
    <PaginaDocFluidaDiag
      titulo="Gestão de Ativos"
      nomeCliente={lead.nome}
      blocos={blocos}
    />
  );
}
