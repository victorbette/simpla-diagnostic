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

  const valorRF     = Number(ativosMap.valorRendaFixa)    || 0;
  const valorRV     = Number(ativosMap.valorRendaVariavel) || 0;
  const valorExt    = Number(ativosMap.valorExterior)      || 0;
  const valorCripto = Number(ativosMap.valorCripto)        || 0;
  const valorAlt    = Number(ativosMap.valorAlternativos)  || 0;
  const totalPatrimonio = valorRF + valorRV + valorExt + valorCripto + valorAlt;

  const ativosDoLead = ATIVOS_INVESTIMENTO.filter(a => ativosMap[a.id] === true);
  const aaTemDados   = ativosDoLead.length > 0;
  const ativosBons   = ativosDoLead.filter(a => a.qualidade === "bom");
  const ativosRuins  = ativosDoLead.filter(a => a.qualidade === "ruim");
  const temRV        = ativosBons.some(a => a.classe === "renda_variavel");
  const temExt       = ativosBons.some(a => a.classe === "exterior");

  function gerarTextoInvestimentos(): string {
    if (!aaTemDados) {
      return "Não identificamos nenhum investimento mapeado em sua carteira. Se você ainda não começou a investir, cada mês de atraso tem um custo real e crescente — o custo dos juros compostos que poderiam estar trabalhando para você, mas não estão.\n\nSe você já investe mas não tem clareza de onde e em quê, isso é igualmente preocupante. Dinheiro sem estratégia raramente cresce como deveria — e muitas vezes está gerando retorno para outros em vez de para você.";
    }
    const nomesRuins = ativosRuins.map(a => a.label);
    const nomesBons  = ativosBons.map(a => a.label);
    if (ativosRuins.length > 0 && ativosBons.length === 0) {
      return `A análise da sua carteira acendeu um alerta importante. Todos os produtos identificados — ${nomesRuins.join(", ")} — estão na categoria de investimentos não recomendados: produtos com taxas elevadas, baixa transparência e retornos que historicamente ficam abaixo do mercado.\n\nIsso significa que, enquanto você trabalha para construir patrimônio, uma parcela dos seus rendimentos pode estar sendo consumida desnecessariamente por custos que não aparecem de forma clara no extrato.\n\nUma revisão estratégica da carteira pode representar uma diferença enorme ao longo dos anos — sem precisar assumir mais risco, apenas alocando melhor o que você já tem.`;
    }
    if (ativosRuins.length > 0 && ativosBons.length > 0) {
      return `Sua carteira tem pontos positivos: você já investe em ${nomesBons.join(", ")}, o que demonstra que você está no caminho.\n\nNo entanto, identificamos também produtos que merecem atenção: ${nomesRuins.join(", ")}. Esses produtos costumam gerar mais resultado para quem os distribui do que para quem os compra — e podem estar comprometendo a eficiência da sua carteira de forma silenciosa.\n\nCom uma revisão estratégica, é possível manter o que funciona, eliminar o que drena e construir uma carteira muito mais eficiente — sem precisar mudar sua tolerância ao risco.`;
    }
    if (!temRV && !temExt) {
      return `Você faz boas escolhas dentro da renda fixa — os produtos que identificamos são sólidos e adequados como base.\n\nMas uma carteira concentrada apenas em renda fixa tem um custo de oportunidade real no longo prazo. Sem ativos de crescimento — como ações e fundos imobiliários — e sem diversificação internacional, o patrimônio tende a crescer significativamente abaixo do seu potencial.\n\nO equilíbrio entre proteção e crescimento é o que diferencia uma carteira que preserva de uma carteira que multiplica. Você já tem a base — agora é hora de construir sobre ela.`;
    }
    return `Sua carteira demonstra uma visão estratégica consistente. Com ${nomesBons.join(", ")}, você tem exposição a classes de ativos que trabalham juntas para crescer, gerar renda e proteger contra riscos.\n\nO próximo nível é otimizar os percentuais de cada classe para o seu perfil e objetivos específicos — garantindo que cada real esteja alocado da forma mais eficiente possível.\n\nCom uma carteira bem estruturada e revisada periodicamente, você maximiza retornos sem precisar assumir riscos desnecessários.`;
  }

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

      {/* Texto explicativo completo */}
      <p style={{ ...TEXTO_CORPO, fontSize: 12, lineHeight: 1.8, marginBottom: 20, whiteSpace: "pre-line" as const }}>
        {gerarTextoInvestimentos()}
      </p>

      {/* Tabela de alocação */}
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
                      color: STATUS_COR[c.status], background: STATUS_BG[c.status],
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
