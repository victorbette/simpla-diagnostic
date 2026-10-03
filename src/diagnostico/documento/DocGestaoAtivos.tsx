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
  const valorPrev   = Number(ativosMap.valorPrevidencia)   || 0;
  const totalPatrimonio = valorRF + valorRV + valorExt + valorCripto + valorAlt + valorPrev;

  const ativosDoLead = ATIVOS_INVESTIMENTO.filter(a => ativosMap[a.id] === true && a.classe !== "previdencia");
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

  const nome = lead.nome.split(" ")[0];

  const anosRestantes = (() => {
    const imeta = Number(lead.dadosColeta.idadeMeta) || 0;
    const nasc  = lead.dadosColeta.dataNascimento || "";
    if (!nasc || imeta <= 0) return 0;
    const hoje = new Date();
    let ano = 0, mes = 0;
    if (nasc.includes('-')) { [ano, mes] = nasc.split('-').map(Number); }
    else { ano = parseInt(nasc.slice(6)); mes = parseInt(nasc.slice(3, 5)); }
    const idade = hoje.getFullYear() - ano + ((hoje.getMonth() + 1) < mes ? -1 : 0);
    return imeta > idade ? imeta - idade : 0;
  })();

  const texto = `Diversificação não é ter muitos produtos: é ter fontes de resultado diferentes, que reagem de formas diferentes ao mesmo cenário. Analisamos a sua carteira sob a ótica de quatro classes, cada uma com uma função que nenhuma outra cumpre: renda fixa (segurança e liquidez), ações (crescimento de longo prazo), fundos imobiliários (renda recorrente e exposição a ativos reais) e investimentos globais (proteção contra o risco-país e o risco de moeda). Quando uma dessas funções está ausente, o seu patrimônio passa a depender de um único cenário econômico dar certo.
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
            {valorPrev > 0 && (
              <tr style={{ background: "#F8FAFF", borderTop: "0.5px solid #E5E7EB" }}>
                <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 700, color: "#111827" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="ti ti-shield-check" style={{ fontSize: 13, color: "#7C3AED" }} />
                    Previdência Privada
                  </div>
                </td>
                <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 700, color: "#111827", textAlign: "right" as const }}>
                  {formatBRL(valorPrev)}
                </td>
              </tr>
            )}
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
  const temRFPilar     = ["tesouro_selic","fundo_rf","lci_lca","cri_cra","debentures","poupanca","cdb"].some(tem);
  const temAcoesPilar  = tem("acoes");
  const temFIIsPilar   = tem("fiis");
  const temGlobalPilar = ["renda_fixa_eua","stocks","reits","etfs_exterior","cripto"].some(tem);

  function gerarTextoDiversificacao(): string {
    const classesPresentes = [
      temRFPilar     && "Renda Fixa",
      temAcoesPilar  && "Ações",
      temFIIsPilar   && "Fundos Imobiliários",
      temGlobalPilar && "Investimentos Globais",
    ].filter(Boolean) as string[];
    const classesAusentes = [
      !temRFPilar     && "Renda Fixa",
      !temAcoesPilar  && "Ações",
      !temFIIsPilar   && "Fundos Imobiliários",
      !temGlobalPilar && "Investimentos Globais",
    ].filter(Boolean) as string[];
    const count = classesPresentes.length;
    const horizonte = anosRestantes > 0 ? ` no seu horizonte de ${anosRestantes} anos` : "";

    // No RF but has other classes — special case
    if (!temRFPilar && count > 0) {
      return `A sua carteira não contempla renda fixa. Essa é a classe que cumpre duas funções que nenhuma outra cumpre: dar previsibilidade ao dinheiro que você vai precisar no curto prazo e oferecer liquidez diante de imprevistos. Sem ela, qualquer necessidade de caixa se transforma em venda de ativo de risco, frequentemente no pior momento possível. É também a renda fixa que permite manter as posições de risco com tranquilidade, porque você deixa de depender delas para viver.`;
    }
    if (count === 0) {
      return `${nome}, nenhum investimento foi mapeado na coleta de dados. A análise de alocação será realizada na reunião inicial.`;
    }
    if (count === 1) {
      const classe = classesPresentes[0];
      return `${nome}, a sua carteira está concentrada em ${classe}. Hoje, todo o seu resultado depende de um único tipo de ativo e, portanto, de um único cenário econômico. Concentração não é apenas risco de perda: é também um limite. Enquanto todas as suas fontes de resultado forem a mesma, o patrimônio não consegue combinar segurança, crescimento e renda: você precisa escolher uma dessas funções para o dinheiro inteiro, em vez de ter as três trabalhando ao mesmo tempo.`;
    }
    if (count === 2) {
      const listPresentes = classesPresentes.join(" e ");
      const listAusentes = classesAusentes.length === 2
        ? `${classesAusentes[0]} e ${classesAusentes[1]}`
        : classesAusentes.join(" e ");
      return `${nome}, a sua carteira contempla duas das quatro classes analisadas: ${listPresentes}. É um começo de estrutura, mas com funções relevantes ainda descobertas: falta ${listAusentes}${horizonte}. Na prática, você já resolveu uma parte do problema e deixou outra inteira em aberto, e é justamente a parte ausente que mais pesa no resultado final.`;
    }
    if (count === 3) {
      const ausenteLabel = classesAusentes[0];
      const funcaoAusente: Record<string, string> = {
        "Renda Fixa":            "segurança e liquidez para o curto prazo",
        "Ações":                 "crescimento de longo prazo",
        "Fundos Imobiliários":   "renda recorrente e exposição a ativos reais",
        "Investimentos Globais": "proteção contra o risco-país e o risco de moeda",
      };
      return `${nome}, a sua carteira contempla três das quatro classes analisadas, o que mostra que você já pensa em alocação e não apenas em produto. A lacuna está em ${ausenteLabel}, responsável por ${funcaoAusente[ausenteLabel] ?? "diversificação adicional"}. Em uma estrutura que já é boa, essa é a lacuna de maior ganho relativo: não se trata de refazer o que está feito, e sim de completar o que falta e revisar as proporções entre o que já existe.`;
    }
    // count === 4
    return `${nome}, a sua carteira contempla as quatro classes analisadas, o que é pouco comum e indica intenção clara de estrutura. É importante registrar, porém, o limite deste indicador: ele mede presença, não proporção. Ter as quatro classes não garante que os pesos entre elas correspondam ao seu perfil, ao seu prazo e ao seu objetivo, e é a proporção, muito mais do que a presença, que determina como a carteira se comporta em cenários adversos.`;
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

  const temPrevidenciaAtivo = lead.dadosColeta.temPrevidencia === true
    || lead.dadosColeta.ativosInvestimento?.["previdencia_privada"] === true;

  if (temPrevidenciaAtivo) {
    const textoPrevidencia = `A previdência privada oferece dois benefícios relevantes para o planejamento de longo prazo: a sucessão patrimonial simplificada — os recursos são transferidos diretamente aos beneficiários sem necessidade de inventário — e o diferimento fiscal, já que o imposto incide apenas no momento do resgate, permitindo que o capital cresça sem tributação intermediária. No caso do PGBL, há ainda a possibilidade de deduzir até 12% da renda bruta anual na declaração completa do IR.\n\nO ponto de atenção está na qualidade do fundo onde o patrimônio está aplicado. Muitos planos comercializados por bancos concentram os recursos em fundos com taxas de administração elevadas e desempenho abaixo do CDI — o que pode comprometer boa parte dos benefícios fiscais. A vantagem da previdência só se concretiza com um fundo de qualidade, com taxa baixa e gestão eficiente.`;

    blocos.push({
      chave: "prev_label",
      grudaNoProximo: true,
      node: (
        <div style={{
          marginTop: 28, fontSize: 12, fontWeight: 700, color: "#374151",
          marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
        }}>
          <i className="ti ti-shield-check" style={{ fontSize: 14 }} />
          Previdência Privada
        </div>
      ),
    });
    blocos.push({
      chave: "prev_texto",
      node: (
        <p style={{
          fontSize: 11, color: "#374151", lineHeight: 1.8,
          margin: 0, textAlign: "justify" as const, whiteSpace: "pre-line" as const,
        }}>
          {textoPrevidencia}
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
