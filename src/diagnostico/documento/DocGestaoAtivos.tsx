import type { Lead } from "../types";
import { ATIVOS_INVESTIMENTO, CLASSES_INVESTIMENTO, NIVEIS_ATRATIVIDADE, type AtivoInvestimento } from "../ativosInvestimento";
import { ATIVOS_TEXTOS } from "../ativosTextos";
import { DOC } from "@/lib/documentoStyles";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface Props { lead: Lead; }

export function DocGestaoAtivos({ lead }: Props) {
  const comecandoDoZero = lead.dadosColeta.comecandoDoZero === true;
  const valorParaInvestir = Number(lead.dadosColeta.valorParaInvestir) || 0;

  const ativosMap = lead.dadosColeta.ativosInvestimento ?? {};

  const valorRF     = Number(ativosMap.valorRendaFixa)    || 0;
  const valorRV     = Number(ativosMap.valorRendaVariavel) || 0;
  const valorExt    = Number(ativosMap.valorExterior)      || 0;
  const valorCripto = Number(ativosMap.valorCripto)        || 0;
  const valorAlt    = Number(ativosMap.valorAlternativos)  || 0;
  const totalPatrimonio = valorRF + valorRV + valorExt + valorCripto + valorAlt;

  const ativosDoLead = ATIVOS_INVESTIMENTO.filter(a => ativosMap[a.id] === true);
  const ativosBons    = ativosDoLead.filter(a => a.qualidade === "muito_atrativo" || a.qualidade === "atrativo");
  const ativosAtencao = ativosDoLead.filter(a => a.qualidade === "moderado");
  const ativosRuins   = ativosDoLead.filter(a => a.qualidade === "pouco_atrativo" || a.qualidade === "nada_atrativo");

  if (comecandoDoZero) {
    const valorStr = valorParaInvestir > 0
      ? `\n\nCom ${valorParaInvestir.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })} disponíveis para investir, é possível`
      : "\n\nÉ possível";

    const textoZero = `Você está prestes a dar um dos passos mais importantes da sua vida financeira — e o fato de estar aqui, com capital disponível e disposição para começar com estratégia, já coloca você muito à frente da maioria.

A maioria das pessoas começa a investir de forma reativa: coloca dinheiro onde o gerente indicou, onde ouviu falar ou simplesmente na poupança porque "é mais seguro". Anos depois, percebe que o patrimônio cresceu menos do que poderia — e que parte do rendimento foi consumida por taxas, produtos inadequados e decisões sem direção.

Você tem a oportunidade de começar diferente.${valorStr} estruturar desde o primeiro dia uma carteira diversificada, eficiente e alinhada ao seu perfil — com cada real trabalhando da forma mais inteligente possível.

Uma carteira bem estruturada combina segurança e crescimento: ativos de renda fixa que protegem e dão liquidez, ativos de renda variável que multiplicam o patrimônio no longo prazo, e diversificação internacional que protege contra os riscos do mercado brasileiro.

O momento de estruturar essa base é agora — porque os juros compostos trabalham de forma exponencial, e o impacto de começar bem hoje se multiplica de maneira surpreendente ao longo dos próximos 10, 15 ou 20 anos.`;

    const blocosZero: BlocoDoc[] = [
      {
        chave: "intro_zero",
        node: (
          <p style={{
            fontSize: 12, color: "#374151", lineHeight: 2,
            marginBottom: 20, whiteSpace: "pre-line" as const,
            textAlign: "justify" as const,
          }}>
            {textoZero}
          </p>
        ),
      },
    ];

    if (valorParaInvestir > 0) {
      blocosZero.push({
        chave: "valor_zero",
        node: (
          <div style={{
            background: "#F0FDF4", border: "0.5px solid #BBF7D0",
            borderRadius: 8, padding: "14px 18px", marginTop: 8,
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <i className="ti ti-trending-up" style={{ fontSize: 24, color: "#15803D", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, color: "#15803D", fontWeight: 600, marginBottom: 2 }}>
                Capital inicial para investir
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>
                {valorParaInvestir.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        ),
      });
    }

    return (
      <PaginaDocFluidaDiag
        titulo="Investimentos"
        nomeCliente={lead.nome}
        blocos={blocosZero}
      />
    );
  }

  const texto = `A forma como você investe define o ritmo com que você se aproxima — ou se afasta — da vida que quer construir. A maioria das pessoas investe de forma reativa: aplica onde ouviu falar, coloca onde o gerente indicou, sem estratégia nem clareza sobre o papel de cada ativo. É essa falta de direção que faz carteiras ficarem estagnadas por anos, rendendo abaixo do potencial e carregando produtos inadequados.

Uma alocação bem definida vai além de maximizar retorno: ela dá clareza em qualquer cenário e elimina decisões por impulso. Uma carteira bem estruturada combina ativos que protegem, ativos que crescem e ativos que geram renda — de forma que, ao longo dos anos, os juros compostos amplifiquem cada decisão certa tomada hoje.
`;

  const classeIcone: Record<string, string> = {
    renda_fixa:    "ti-building-bank",
    renda_variavel: "ti-trending-up",
    exterior:      "ti-world",
    cripto:        "ti-currency-bitcoin",
    alternativos:  "ti-chart-bar",
  };

  const classeValorMap: Record<string, number> = {
    renda_fixa:    valorRF,
    renda_variavel: valorRV,
    exterior:      valorExt,
    cripto:        valorCripto,
    alternativos:  valorAlt,
  };

  const blocos: BlocoDoc[] = [];

  blocos.push({
    chave: "intro",
    node: (
      <p style={{
        fontSize: 12, color: "#374151", lineHeight: 2,
        marginBottom: 20, whiteSpace: "pre-line" as const,
        textAlign: "justify" as const,
      }}>
        {texto}
      </p>
    ),
  });

  blocos.push({
    chave: "tabela",
    node: (
      <div style={{ border: `1px solid ${DOC.linha}`, borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFF" }}>
              <th style={{ textAlign: "left",  padding: "8px 12px", fontSize: 11, color: "#6B7280", fontWeight: 600 }}>Classe / Ativo</th>
              <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, color: "#6B7280", fontWeight: 600, width: 130 }}>Valor / Avaliação</th>
            </tr>
          </thead>
          <tbody>
            {CLASSES_INVESTIMENTO.flatMap(cls => {
              const valor = classeValorMap[cls.classe] ?? 0;
              const assetsInClass = ativosDoLead.filter(a => a.classe === cls.classe);
              if (valor === 0 && assetsInClass.length === 0) return [];
              return [
                <tr key={cls.classe} style={{ background: "#F8FAFF", borderTop: "0.5px solid #E5E7EB" }}>
                  <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 700, color: "#111827" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <i className={`ti ${classeIcone[cls.classe]}`} style={{ fontSize: 13, color: cls.cor }} />
                      {cls.label}
                    </div>
                  </td>
                  <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 700, color: "#111827", textAlign: "right" as const }}>
                    {valor > 0 ? formatBRL(valor) : "—"}
                  </td>
                </tr>,
                ...assetsInClass.map(ativo => {
                  const nivel = NIVEIS_ATRATIVIDADE[ativo.qualidade];
                  return (
                    <tr key={ativo.id} style={{ borderTop: "0.5px solid #F3F4F6" }}>
                      <td style={{ padding: "6px 12px 6px 28px", fontSize: 11, color: "#4B5563" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: "#CBD5E1", fontSize: 10 }}>↳</span>
                          {ativo.label}
                        </div>
                      </td>
                      <td style={{ padding: "6px 12px", textAlign: "right" as const }}>
                        <span style={{
                          fontSize: 9, fontWeight: 600,
                          color: nivel.cor, background: nivel.bg,
                          border: `0.5px solid ${nivel.border}`,
                          borderRadius: 4, padding: "2px 6px",
                          whiteSpace: "nowrap" as const,
                          display: "inline-block",
                        }}>
                          {nivel.label}
                        </span>
                      </td>
                    </tr>
                  );
                }),
              ];
            })}
            {ativosDoLead.length === 0 && totalPatrimonio === 0 && (
              <tr>
                <td colSpan={2} style={{ padding: "16px 12px", fontSize: 12, color: "#9CA3AF", textAlign: "center" as const }}>
                  Nenhum investimento foi mapeado na coleta de dados.
                </td>
              </tr>
            )}
          </tbody>
          {totalPatrimonio > 0 && (
            <tfoot>
              <tr style={{ background: "#F0F7FF", borderTop: "0.5px solid #E5E7EB" }}>
                <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "#111827" }}>Total investido</td>
                <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "#111827", textAlign: "right" as const }}>{formatBRL(totalPatrimonio)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    ),
  });

  // Set compartilhado entre seções para deduplicar grupos
  const gruposProcessados = new Set<string>();

  function renderBlocoAtivo(
    ativo: AtivoInvestimento,
    borderColor: string,
    fallbackField: "positivo" | "atencao" | "negativo",
    chavePrefix: string,
  ): BlocoDoc | null {
    const chaveGrupo = ativo.grupoTexto ?? ativo.id;
    if (gruposProcessados.has(chaveGrupo)) return null;
    gruposProcessados.add(chaveGrupo);

    const textoAtivo = ATIVOS_TEXTOS[chaveGrupo];
    const texto = textoAtivo?.opiniao ?? textoAtivo?.[fallbackField];
    if (!texto) return null;

    // Todos os ativos selecionados que pertencem a este grupo
    const ativosGrupo = ativosDoLead.filter(a => (a.grupoTexto ?? a.id) === chaveGrupo);
    const labelGrupo = ativosGrupo.map(a => a.label).join(" / ");
    const nivel = NIVEIS_ATRATIVIDADE[ativo.qualidade];

    return {
      chave: `${chavePrefix}_${chaveGrupo}`,
      node: (
        <div style={{ marginBottom: 12, paddingLeft: 12, borderLeft: `2px solid ${borderColor}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#111827", marginBottom: 3 }}>
            {labelGrupo}
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, color: nivel.cor, marginBottom: 3 }}>
            {nivel.label}
          </div>
          <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.7, margin: 0, textAlign: "justify" as const }}>
            {texto.trim()}
          </p>
        </div>
      ),
    };
  }

  // ── Diversificação ──
  const tem = (id: string) => ativosMap[id] === true;
  const temRFPilar     = ["tesouro_selic","fundo_rf","lci_lca","cri_cra","debentures","poupanca"].some(tem);
  const temAcoesPilar  = tem("acoes");
  const temFIIsPilar   = tem("fiis");
  const temGlobalPilar = ["renda_fixa_eua","stocks","reits","etfs_exterior","cripto"].some(tem);

  function gerarTextoDiversificacao(): string {
    const faltam = [
      !temRFPilar     && "Renda Fixa",
      !temAcoesPilar  && "Ações",
      !temFIIsPilar   && "Fundos Imobiliários",
      !temGlobalPilar && "Investimentos Globais",
    ].filter(Boolean) as string[];

    if (faltam.length === 0) {
      return `Sua carteira está distribuída pelos quatro pilares recomendados pela Simpla — Renda Fixa, Ações, Fundos Imobiliários e Investimentos Globais. Essa diversificação é fundamental para equilibrar proteção e crescimento em diferentes cenários econômicos.`;
    }
    if (!temRFPilar && !temAcoesPilar && !temFIIsPilar && !temGlobalPilar) {
      return `Nenhum ativo foi mapeado. Para analisar a diversificação da sua carteira, preencha os investimentos na etapa de coleta.`;
    }
    if (temRFPilar && !temAcoesPilar && !temFIIsPilar && !temGlobalPilar) {
      return `Sua carteira está concentrada em Renda Fixa, sem exposição a Ações, Fundos Imobiliários ou Investimentos Globais. Embora a renda fixa ofereça segurança e previsibilidade, uma carteira sem ativos de crescimento tem um custo de oportunidade relevante no longo prazo. A Simpla recomenda distribuir o patrimônio pelos quatro pilares para equilibrar proteção, geração de renda e crescimento real.`;
    }
    if (!temGlobalPilar) {
      const base = (temRFPilar || temAcoesPilar || temFIIsPilar)
        ? `Sua carteira ainda não tem exposição internacional.`
        : `Não identificamos exposição internacional na sua carteira.`;
      return `${base} O investimento global é fundamental para reduzir o risco-Brasil e capturar oportunidades em economias mais desenvolvidas — especialmente nos EUA, que concentra as maiores empresas do mundo e oferece um ambiente regulatório mais sólido. Renda Fixa americana, Stocks, REITs e ETFs globais são as principais formas de acessar essa diversificação.`;
    }
    if (!temAcoesPilar && !temFIIsPilar) {
      return `Você tem renda fixa e investimentos globais, mas sua carteira não conta com Ações nem Fundos Imobiliários. Esses dois pilares são essenciais para o crescimento real do patrimônio no longo prazo e para a geração de renda passiva — e estão ausentes da sua estratégia atual.`;
    }
    const lista = faltam.length === 1
      ? faltam[0]
      : faltam.slice(0, -1).join(", ") + " e " + faltam[faltam.length - 1];
    return `${faltam.length === 1 ? "Um pilar ainda está ausente" : "Alguns pilares ainda estão ausentes"} da sua carteira: ${lista}. A Simpla recomenda distribuição entre Renda Fixa, Ações, Fundos Imobiliários e Investimentos Globais para equilibrar segurança, crescimento e diversificação geográfica.`;
  }

  const pilares = [
    { label: "Renda Fixa",            icone: "ti-building-bank", ok: temRFPilar },
    { label: "Ações",                  icone: "ti-trending-up",   ok: temAcoesPilar },
    { label: "Fundos Imobiliários",    icone: "ti-building",      ok: temFIIsPilar },
    { label: "Investimentos Globais",  icone: "ti-world",         ok: temGlobalPilar },
  ];

  if (ativosDoLead.length > 0) {
    blocos.push({
      chave: "div_label",
      grudaNoProximo: true,
      node: (
        <div style={{
          marginTop: 28, fontSize: 12, fontWeight: 700, color: "#374151",
          marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
        }}>
          <i className="ti ti-layout-grid" style={{ fontSize: 14 }} />
          Diversificação da Carteira
        </div>
      ),
    });
    blocos.push({
      chave: "div_pilares",
      grudaNoProximo: true,
      node: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
          {pilares.map(p => (
            <div key={p.label} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 8,
              background: p.ok ? "#F0FDF4" : "#FFF5F5",
              border: `0.5px solid ${p.ok ? "#BBF7D0" : "#FCA5A5"}`,
            }}>
              <i className={`ti ${p.ok ? "ti-circle-check" : "ti-circle-x"}`}
                style={{ fontSize: 14, color: p.ok ? "#15803D" : "#B91C1C", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: p.ok ? "#14532D" : "#7F1D1D" }}>{p.label}</div>
                <div style={{ fontSize: 9, color: p.ok ? "#15803D" : "#B91C1C" }}>{p.ok ? "Presente" : "Ausente"}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    });
    blocos.push({
      chave: "div_texto",
      node: (
        <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.8, margin: 0, textAlign: "justify" as const }}>
          {gerarTextoDiversificacao()}
        </p>
      ),
    });
  }

  if (ativosBons.length > 0) {
    blocos.push({
      chave: "bons_label",
      grudaNoProximo: true,
      node: (
        <div style={{
          marginTop: 28, fontSize: 12, fontWeight: 700, color: "#15803D",
          marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
        }}>
          <i className="ti ti-star" style={{ fontSize: 14 }} />
          Atrativo ou Muito Atrativo
        </div>
      ),
    });
    ativosBons.forEach((ativo) => {
      const bloco = renderBlocoAtivo(ativo, "#BBF7D0", "positivo", "bom");
      if (bloco) blocos.push(bloco);
    });
  }

  if (ativosAtencao.length > 0) {
    blocos.push({
      chave: "atencao_label",
      grudaNoProximo: true,
      node: (
        <div style={{
          marginTop: 20, fontSize: 12, fontWeight: 700, color: "#B45309",
          marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 14 }} />
          Atratividade Moderada
        </div>
      ),
    });
    ativosAtencao.forEach((ativo) => {
      const bloco = renderBlocoAtivo(ativo, "#FCD34D", "atencao", "atencao");
      if (bloco) blocos.push(bloco);
    });
  }

  if (ativosRuins.length > 0) {
    blocos.push({
      chave: "ruins_label",
      grudaNoProximo: true,
      node: (
        <div style={{
          marginTop: 20, fontSize: 12, fontWeight: 700, color: "#B91C1C",
          marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
        }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 14 }} />
          Pouco ou Nada Atrativo
        </div>
      ),
    });
    ativosRuins.forEach((ativo) => {
      const bloco = renderBlocoAtivo(ativo, "#FCA5A5", "negativo", "ruim");
      if (bloco) blocos.push(bloco);
    });
  }

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
      titulo="Investimentos"
      nomeCliente={lead.nome}
      blocos={blocos}
    />
  );
}
