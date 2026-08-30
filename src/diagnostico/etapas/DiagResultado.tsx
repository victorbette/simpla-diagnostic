import type { Lead } from "../types";
import { nivelScore, calcularScoresDiag } from "../scoresDiag";
import { ATIVOS_INVESTIMENTO, NIVEIS_ATRATIVIDADE } from "../ativosInvestimento";
import { ATIVOS_TEXTOS } from "../ativosTextos";

interface Props {
  lead: Lead;
  onAtualizar?: (patch: Partial<Lead>) => void;
}

function GaugeDiag({
  score,
  label,
  icone,
  nivel,
}: {
  score: number;
  label: string;
  icone: string;
  nivel: ReturnType<typeof nivelScore>;
}) {
  const W = 160, H = 90;
  const CX = W / 2, CY = H;
  const R_EXT = 72, R_INT = 52;
  const scoreClamped = Math.max(0, Math.min(100, score));
  const graus = 180 - (scoreClamped / 100) * 180;
  const rad = (graus * Math.PI) / 180;
  const xFimExt = CX + R_EXT * Math.cos(rad);
  const yFimExt = CY - R_EXT * Math.sin(rad);
  const xFimInt = CX + R_INT * Math.cos(rad);
  const yFimInt = CY - R_INT * Math.sin(rad);
  const largeArc = 0;

  const pathFundo = [
    `M ${CX - R_EXT} ${CY}`,
    `A ${R_EXT} ${R_EXT} 0 0 1 ${CX + R_EXT} ${CY}`,
    `L ${CX + R_INT} ${CY}`,
    `A ${R_INT} ${R_INT} 0 0 0 ${CX - R_INT} ${CY}`,
    "Z",
  ].join(" ");

  const pathPreenchido = scoreClamped > 0 ? [
    `M ${CX - R_EXT} ${CY}`,
    `A ${R_EXT} ${R_EXT} 0 ${largeArc} 1 ${xFimExt} ${yFimExt}`,
    `L ${xFimInt} ${yFimInt}`,
    `A ${R_INT} ${R_INT} 0 ${largeArc} 0 ${CX - R_INT} ${CY}`,
    "Z",
  ].join(" ") : "";

  return (
    <div style={{
      background: "white",
      border: "0.5px solid #E5E7EB",
      borderRadius: 12,
      padding: "20px 16px 16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <svg width={W} height={H + 10} viewBox={`0 0 ${W} ${H + 10}`} style={{ overflow: "visible" }}>
        <path d={pathFundo} fill="#F3F4F6" />
        {scoreClamped > 0 && (
          <path d={pathPreenchido} fill={nivel.cor} opacity={0.9} />
        )}
        <text x={CX} y={CY - 10} textAnchor="middle" fontSize="22" fontWeight="800" fill={score >= 0 ? nivel.cor : "#9CA3AF"}>
          {score >= 0 ? scoreClamped : "—"}
        </text>
        <text x={CX} y={CY + 6} textAnchor="middle" fontSize="10" fill="#9CA3AF">
          /100
        </text>
      </svg>

      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
        <i className={`ti ${icone}`} style={{ fontSize: 13, color: nivel.cor }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", textAlign: "center" }}>
          {label}
        </span>
      </div>

      <span style={{
        fontSize: 10, fontWeight: 600,
        color: nivel.cor, background: nivel.bg,
        padding: "2px 10px", borderRadius: 99,
        marginTop: 6,
      }}>
        {nivel.label}
      </span>
    </div>
  );
}

export function DiagResultado({ lead }: Props) {
  const { dadosColeta } = lead;

  const {
    scoreLF, scoreInvestimentos, scoreBlindagem, scoreGeral,
    lfTemDados, pctIF,
    aaTemDados, nRuinsCount,
    pontoDiversificacao, pontoQualidade,
    possuiSeguro, possuiPrevidencia,
    comecandoDoZero,
  } = calcularScoresDiag(dadosColeta);

  const casado    = dadosColeta.estadoCivil === "casado" || dadosColeta.estadoCivil === "uniao_estavel";
  const conjuge   = dadosColeta.nomeConjuge ?? "";
  const filhos    = dadosColeta.filhos ?? [];
  const temFilhos = filhos.length > 0;

  const nome = lead.nome.split(" ")[0];

  function introInvestimentos(): string {
    if (comecandoDoZero) {
      const valor = Number(dadosColeta.valorParaInvestir) || 0;
      const valorStr = valor > 0
        ? ` — ${valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })} —`
        : "";
      return `Você está no ponto de partida — e esse é, na verdade, um momento de enorme vantagem.\n\nComeçar a investir do zero com estratégia é infinitamente melhor do que ter investido por anos sem ela. Quem começa certo não precisa depois desfazer decisões ruins, resgatar produtos inadequados ou conviver com taxas que corroem o patrimônio silenciosamente.\n\nO capital que você tem disponível${valorStr} é o ponto de partida para construir uma carteira que trabalha para você todos os dias. Os juros compostos são mais poderosos quanto mais cedo começam a agir — e cada mês de atraso tem um custo real que não aparece em nenhum extrato, mas que se acumula de forma surpreendente ao longo dos anos.\n\nEsse é o momento de começar do jeito certo.`;
    }
    if (!aaTemDados) {
      return "Não identificamos nenhum investimento mapeado em sua carteira. Se você ainda não começou a investir, cada mês de atraso tem um custo real e crescente — o custo dos juros compostos que poderiam estar trabalhando para você, mas não estão.\n\nSe você já investe mas não tem clareza de onde e em quê, isso é igualmente preocupante. Dinheiro sem estratégia raramente cresce como deveria — e muitas vezes está gerando retorno para outros em vez de para você.";
    }
    if (nRuinsCount > 0) {
      return `Identificamos pontos de atenção na composição atual da sua carteira. Abaixo, a análise detalhada de cada posição — e o que recomendamos para o seu cenário.`;
    }
    return `Sua carteira conta com boas posições para o cenário atual. Abaixo, a análise detalhada de cada ativo — e o que observamos em relação ao momento de mercado.`;
  }

  function gerarTextoDiversificacao(): string {
    const am = dadosColeta.ativosInvestimento ?? {};
    const tem = (id: string) => am[id] === true;
    const temRFPilar  = ["tesouro_selic","fundo_rf","lci_lca","cri_cra","debentures","poupanca"].some(tem);
    const temAcoesPilar = tem("acoes");
    const temFIIsPilar  = tem("fiis");
    const temGlobalPilar = ["renda_fixa_eua","stocks","reits","etfs_exterior","cripto"].some(tem);
    const faltam = [
      !temRFPilar && "Renda Fixa",
      !temAcoesPilar && "Ações",
      !temFIIsPilar && "Fundos Imobiliários",
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
      const temOutros = temRFPilar || temAcoesPilar || temFIIsPilar;
      const base = temOutros
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

  function renderConteudoInvestimentos() {
    const intro = introInvestimentos();

    if (comecandoDoZero || !aaTemDados) {
      return (
        <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.9, margin: 0, whiteSpace: "pre-line", textAlign: "justify" as const }}>
          {intro}
        </p>
      );
    }

    const am = dadosColeta.ativosInvestimento ?? {};
    const ativosDoLead = ATIVOS_INVESTIMENTO.filter(a => am[a.id] === true);
    const grupos = new Set<string>();

    // Collect asset blocks in order: bons → atencao → ruins
    const blocos: { chave: string; label: string; nivel: typeof NIVEIS_ATRATIVIDADE[keyof typeof NIVEIS_ATRATIVIDADE]; texto: string }[] = [];
    for (const ativo of ativosDoLead) {
      const chave = ativo.grupoTexto ?? ativo.id;
      if (grupos.has(chave)) continue;
      grupos.add(chave);
      const textoAtivo = ATIVOS_TEXTOS[chave];
      const texto = textoAtivo?.opiniao ?? textoAtivo?.positivo ?? textoAtivo?.atencao ?? textoAtivo?.negativo;
      if (!texto) continue;
      const ativosGrupo = ativosDoLead.filter(a => (a.grupoTexto ?? a.id) === chave);
      blocos.push({
        chave,
        label: ativosGrupo.map(a => a.label).join(" / "),
        nivel: NIVEIS_ATRATIVIDADE[ativo.qualidade],
        texto,
      });
    }

    // Diversification pillars
    const tem = (id: string) => am[id] === true;
    const pilares = [
      { label: "Renda Fixa",            icone: "ti-building-bank", ok: ["tesouro_selic","fundo_rf","lci_lca","cri_cra","debentures","poupanca"].some(tem) },
      { label: "Ações",                  icone: "ti-trending-up",   ok: tem("acoes") },
      { label: "Fundos Imobiliários",    icone: "ti-building",      ok: tem("fiis") },
      { label: "Investimentos Globais",  icone: "ti-world",         ok: ["renda_fixa_eua","stocks","reits","etfs_exterior","cripto"].some(tem) },
    ];

    return (
      <>
        <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.9, margin: 0, marginBottom: 20, textAlign: "justify" as const }}>
          {intro}
        </p>

        {/* Detalhamento do Score */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Diversificação", valor: pontoDiversificacao, maximo: 60, hint: "4 pilares × 15 pts" },
            { label: "Qualidade dos Ativos", valor: pontoQualidade, maximo: 40, hint: "Média da qualidade dos ativos" },
          ].map(c => {
            const pct = Math.round((c.valor / c.maximo) * 100);
            const cor = pct >= 75 ? "#15803D" : pct >= 40 ? "#B45309" : "#B91C1C";
            const bg  = pct >= 75 ? "#F0FDF4" : pct >= 40 ? "#FEF3C7" : "#FFF5F5";
            const barCor = pct >= 75 ? "#16A34A" : pct >= 40 ? "#D97706" : "#DC2626";
            return (
              <div key={c.label} style={{ background: bg, border: `0.5px solid ${cor}30`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 8 }}>{c.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: "#E5E7EB", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: barCor, borderRadius: 99, transition: "width 0.4s" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: cor, minWidth: 44, textAlign: "right" as const }}>
                    {c.valor}<span style={{ fontSize: 10, fontWeight: 400, color: "#9CA3AF" }}>/{c.maximo}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {blocos.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 10 }}>
              Avaliação por ativo
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: 20 }}>
              {blocos.map(b => (
                <div key={b.chave} style={{
                  borderLeft: `3px solid ${b.nivel.border}`,
                  padding: "10px 14px",
                  borderRadius: "0 8px 8px 0",
                  background: "white",
                  border: "0.5px solid #F3F4F6",
                  borderLeftWidth: 3,
                  borderLeftStyle: "solid",
                  borderLeftColor: b.nivel.border,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{b.label}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: b.nivel.cor,
                      background: "white", border: `1px solid ${b.nivel.border}`,
                      padding: "1px 7px", borderRadius: 99,
                    }}>
                      {b.nivel.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.8, margin: 0, textAlign: "justify" as const }}>
                    {b.texto}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 10 }}>
          Diversificação da carteira
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
          {pilares.map(p => (
            <div key={p.label} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 8,
              background: p.ok ? "#F0FDF4" : "#FFF5F5",
              border: `1px solid ${p.ok ? "#BBF7D0" : "#FCA5A5"}`,
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
        <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.8, margin: 0, textAlign: "justify" as const }}>
          {gerarTextoDiversificacao()}
        </p>
      </>
    );
  }

  function gerarTextoBlindagem(): string {
    const familiaRef = casado && conjuge ? conjuge : casado ? "sua família" : temFilhos ? (filhos.length === 1 ? (filhos[0].nome || "seu filho") : "seus filhos") : "quem você ama";
    const nFilhosStr = filhos.length === 1 ? (filhos[0].nome || "seu filho") : `seus ${filhos.length} filhos`;
    const conjugeRef = conjuge || "sua família";

    if (!possuiSeguro && !possuiPrevidencia) {
      if (casado && temFilhos) {
        return `${nome}, pare por um momento e imagine o seguinte: amanhã cedo, um evento inesperado — um acidente, uma doença grave, uma invalidez — e você não consegue mais trabalhar. O que acontece com ${conjugeRef} e ${nFilhosStr}?\n\nQuem paga o aluguel ou a parcela da casa no mês que vem? Quem garante a escola ${filhos.length === 1 ? "do" : "dos"} ${nFilhosStr}? Quem cobre as contas do dia a dia enquanto ${conjugeRef} tenta reorganizar a vida? Essas não são perguntas retóricas — são perguntas com respostas concretas, e hoje a resposta é: ninguém. Porque você não tem nenhuma estrutura de proteção montada.\n\nA maioria das pessoas adia esse assunto porque ele parece distante ou porque "dá para deixar para depois". Mas imprevisto não avisa. Invalidez por acidente ou doença é estatisticamente muito mais comum do que as pessoas imaginam — e quando acontece, o impacto financeiro na família pode ser devastador e imediato. O patrimônio que levou anos para construir pode se dissipar em meses sem uma renda para sustentá-lo.\n\nEsse é o pilar mais urgente da sua estratégia financeira. Não porque é o mais sofisticado, mas porque é o que garante que todo o resto — os investimentos, a aposentadoria, os projetos da família — ainda vai existir se algo der errado. Sem blindagem, tudo que você construiu e ainda vai construir está exposto a um único evento ruim. Esse ponto precisa ser resolvido antes de qualquer outra decisão financeira.`;
      }
      if (casado) {
        return `${nome}, você e ${conjugeRef} construíram muito juntos — uma vida, uma rotina, um futuro que estão planejando. Mas esse futuro está sendo construído sobre uma base sem proteção, e esse é um risco que precisa ser dito com clareza.\n\nSe amanhã um imprevisto tirar você de cena — temporária ou definitivamente — o que acontece com ${conjugeRef}? Quem sustenta a vida que vocês construíram juntos? O patrimônio que você acumulou pode cobrir algum tempo, mas sem uma renda ou uma cobertura estruturada, ele começa a ser consumido rapidamente. Meses viram anos, e o que era para ser legado vira sobrevivência.\n\nSem seguro de vida e sem previdência, você está deixando ${conjugeRef} exposto a um risco que não precisa existir. Um seguro adequado garante que um evento trágico não se transforme também em uma catástrofe financeira. Uma previdência bem estruturada garante que a aposentadoria de ambos não dependa exclusivamente da capacidade de trabalho contínuo.\n\nEsses dois pilares — seguro e previdência — são o alicerce de qualquer estratégia financeira séria para quem tem responsabilidades com outra pessoa. Sem eles, todo o resto da estratégia está em risco.`;
      }
      if (temFilhos) {
        return `${nome}, você é o principal pilar financeiro ${filhos.length === 1 ? `de ${nFilhosStr}` : `dos seus filhos`} — e isso é uma das maiores responsabilidades que existem. Mas hoje, sem seguro de vida e sem previdência, essa responsabilidade está completamente desprotegida.\n\nPense de forma concreta: se amanhã você ficasse incapacitado de trabalhar — por acidente, doença grave ou qualquer outro evento — quem garantiria o sustento ${filhos.length === 1 ? "dele" : "deles"}? Quem pagaria a escola, a alimentação, as despesas do dia a dia? A resposta honesta é que, sem uma estrutura de proteção, não há resposta para essa pergunta — e isso é um risco real que não pode ser ignorado.\n\nA ausência de seguro de vida é um dos erros financeiros mais caros que uma família pode cometer. Não porque o seguro seja caro — ele é surpreendentemente acessível quando contratado da forma certa — mas porque o custo de não ter é medido em sofrimento e instabilidade financeira que se estendem por anos.\n\nA previdência, por sua vez, garante que você chegue à aposentadoria com estrutura financeira, sem depender exclusivamente dos seus filhos ou de uma renda de trabalho. Esses dois pilares juntos formam a base de proteção que qualquer família com dependentes precisa ter antes de qualquer outro planejamento.`;
      }
      return `${nome}, mesmo sem dependentes diretos, a ausência de proteção financeira cria uma vulnerabilidade que pode destruir décadas de trabalho em um único evento.\n\nInvalidez, doença grave ou falecimento precoce não são riscos abstratos — são realidades que acontecem com frequência muito maior do que as pessoas imaginam, e sem uma estrutura de proteção, o impacto financeiro é devastador. Sem renda, sem cobertura, o patrimônio acumulado começa a ser consumido para cobrir despesas que uma apólice ou uma previdência cobririam por fração do custo.\n\nAlém disso, sem previdência estruturada, a aposentadoria depende inteiramente da sua capacidade de trabalhar e investir até lá — sem margem para imprevistos. Uma estrutura de proteção adequada garante que, independente do que aconteça, você chegará ao futuro que planejou.\n\nEsse é o pilar que mais pessoas negligenciam e que, quando faz falta, não pode mais ser contratado nas mesmas condições. Quanto mais cedo for estruturado, menor o custo e maior a proteção.`;
    }

    if (possuiSeguro && !possuiPrevidencia) {
      return `${nome}, você já deu um passo muito importante ao ter um seguro de vida — isso demonstra consciência sobre a proteção ${casado || temFilhos ? "da sua família" : "do seu patrimônio"} e coloca você à frente da maioria das pessoas, que jamais estruturam esse pilar.\n\nMas a proteção ainda está incompleta, e o gap é relevante. O seguro cobre o presente — garante que, em caso de falecimento ou invalidez, ${familiaRef} tenha suporte financeiro imediato. O que ele não cobre é o futuro: a aposentadoria, a manutenção do padrão de vida ao longo dos anos, a independência financeira no longo prazo.\n\nSem previdência privada, você está dependendo exclusivamente dos seus investimentos para chegar onde quer — e sem a disciplina e a estrutura específica de um plano previdenciário, essa jornada é mais vulnerável a interrupções, resgates antecipados e decisões tomadas sob pressão.\n\nA previdência não é só um investimento — é um mecanismo de disciplina de longo prazo com vantagens fiscais reais, especialmente para quem está em faixas de renda mais altas. Combinada com um seguro adequado, ela completa a blindagem e garante que ${casado || temFilhos ? "sua família" : "você"} esteja protegido tanto no presente quanto no futuro.`;
    }

    if (!possuiSeguro && possuiPrevidencia) {
      return `${nome}, você já pensa no futuro ao investir em previdência — isso é uma decisão inteligente e que a maioria das pessoas deixa para tarde demais. Mas há um ponto crítico que precisa de atenção imediata: e o presente?\n\nA previdência protege o futuro — a aposentadoria, o longo prazo, a acumulação de patrimônio com eficiência fiscal. O que ela não faz é proteger ${casado || temFilhos ? "sua família" : "você"} de um imprevisto que aconteça hoje. Se amanhã uma doença grave, um acidente ou uma invalidez tirasse você de cena, a previdência não substituiria a sua renda imediata — e sem um seguro, ${familiaRef} enfrentaria não só a crise emocional, mas também uma crise financeira simultânea.\n\nSeguro de vida e invalidez é o pilar que protege o presente — que garante que tudo que você está construindo (incluindo a própria previdência) continue existindo se algo inesperado acontecer. Sem ele, um único evento pode comprometer décadas de planejamento.\n\nO custo de um seguro adequado é, na maioria dos casos, surpreendentemente baixo em relação ao benefício que oferece. Ele é o complemento direto da previdência — e juntos, esses dois pilares formam a base de uma blindagem patrimonial completa.`;
    }

    // Tem ambos
    return `${nome}, você está em um patamar que a maioria das pessoas nunca alcança: tem seguro de vida e previdência privada estruturados — os dois pilares fundamentais de uma blindagem patrimonial sólida. Isso é resultado de consciência e planejamento, e protege ${casado || temFilhos ? "sua família" : "você"} tanto no presente quanto no longo prazo.\n\nMas ter os pilares não é suficiente — o que importa é se o tamanho das coberturas está adequado à sua realidade atual. O seguro contratado há anos pode ter um capital segurado que não reflete mais o padrão de vida e as responsabilidades de hoje. A previdência pode estar em um produto com taxas elevadas ou em uma alocação inadequada para o seu perfil e horizonte.\n\nUma revisão periódica dessas coberturas é tão importante quanto tê-las. O mercado evoluiu — existem seguros mais eficientes, previdências com taxas menores e alocações mais adequadas do que havia há alguns anos. O que era suficiente quando foi contratado pode não ser mais hoje.\n\nNa reunião inicial, vamos mapear em detalhes se os valores cobertos são compatíveis com as necessidades reais ${casado || temFilhos ? "da sua família" : "suas"} e se há oportunidades de melhorar a eficiência dessa proteção sem aumentar o custo. Ter os pilares é o começo — calibrá-los corretamente é o que transforma proteção em blindagem de verdade.`;
  }

  function gerarTexto(area: string): string {
    if (area === "lf") {
      if (!lfTemDados) {
        return "A liberdade financeira começa com clareza — e clareza começa com números.\n\nA maioria das pessoas passa a vida trabalhando sem saber exatamente para quê: quanto precisa acumular para parar quando quiser, viajar sem culpa, dar a melhor educação para os filhos ou simplesmente acordar de manhã sem a pressão de ter que trabalhar por necessidade.\n\nEssa falta de clareza não é inocente — ela tem um custo enorme. Cada ano sem um plano definido é um ano em que os juros compostos poderiam estar trabalhando a seu favor, mas não estão. Complete os seus dados e descubra onde você realmente está e o que precisa mudar para construir a vida que você imagina para a sua família.";
      }
      if (pctIF <= 30) {
        return `${nome}, este número precisa ser dito com clareza: a trajetória atual coloca você em uma situação de risco real no longo prazo.\n\nPense nos projetos que você tem para a sua família — a escola dos filhos, a casa própria, as viagens que ainda não fez, a aposentadoria tranquila que imagina para você e para quem você ama. Tudo isso depende de um patrimônio que, com o ritmo atual, chegará a apenas ${pctIF}% do necessário. Isso significa escolhas dolorosas no futuro: abrir mão de projetos, reduzir o padrão de vida ou continuar trabalhando por obrigação muito além do que desejaria.\n\nO que dói mais não é a realidade dos números — é saber que isso ainda pode ser mudado, mas que cada mês de atraso torna a mudança mais difícil e mais cara. O tempo nos investimentos é insubstituível. Quem começa a agir hoje, mesmo com pequenos ajustes, tem uma vantagem enorme sobre quem decide esperar o "momento certo" — que raramente chega sozinho.\n\nVocê ainda tem tempo de reescrever esse cenário. Mas essa decisão precisa ser tomada agora — não amanhã, não no próximo mês. Agora.`;
      }
      if (pctIF <= 50) {
        return `${nome}, sua projeção atual cobre ${pctIF}% da renda que você imaginou ter na aposentadoria. Esse número tem um significado concreto: sem mudanças, você chegará nessa fase com menos da metade do que precisa para viver com o padrão que deseja — e isso se traduz em escolhas que você não quer fazer.\n\nPense nos sonhos que você tem para a sua família. A viagem que sempre adiou. A faculdade dos filhos em uma boa instituição. A possibilidade de se aposentar quando quiser, não quando for obrigado. Todos esses projetos têm um preço — e esse preço precisa estar no plano.\n\nA boa notícia é que você está em um momento em que ainda é possível mudar de forma significativa. Mas a janela vai se fechando. Cada ano que passa sem uma estratégia clara aumenta o esforço necessário para chegar ao mesmo resultado — e reduz as opções disponíveis.\n\nUma estratégia bem estruturada pode acelerar essa jornada de forma surpreendente. Pequenos ajustes no valor investido, na rentabilidade da carteira ou na forma como o patrimônio está alocado podem fazer uma diferença enorme em 10 ou 15 anos. O caminho existe — o que falta é traçar o plano e começar a seguir.`;
      }
      if (pctIF <= 90) {
        return `${nome}, você está mais perto do que a maioria das pessoas — sua projeção já atinge ${pctIF}% da meta que você definiu para si mesmo. Isso é resultado de disciplina e consistência, e merece reconhecimento.\n\nMas "quase lá" sem a estratégia certa pode custar caro. São os últimos percentuais que mais exigem atenção: uma carteira mal diversificada, uma rentabilidade abaixo do potencial por alguns anos, ou uma decisão errada em um momento de volatilidade — e o que levou anos para construir pode demorar muito mais para recuperar.\n\nPense no que esse resultado representa para a sua família: a diferença entre uma aposentadoria com liberdade total — para viajar, para estar presente, para apoiar os filhos nos projetos deles — e uma aposentadoria com restrições que você não planejou. Esse intervalo entre ${pctIF}% e 100% é exatamente o que separa esses dois cenários.`;
      }
      return `${nome}, você chegou a um lugar que a maioria das pessoas nunca alcança: sua projeção indica que, mantendo a disciplina atual, você chegará à aposentadoria com o patrimônio necessário para gerar a renda que deseja — para sempre.\n\nIsso significa liberdade de verdade: acordar de manhã e escolher como usar o seu tempo, não por obrigação, mas por vontade. Significa poder estar presente nos momentos que importam para a sua família, apoiar os projetos dos seus filhos, viver as experiências que sempre planejou — sem a pressão financeira que acompanha a maioria das pessoas ao longo da vida.\n\nMas construir é só metade do trabalho. Quem chegou tão longe tem muito a proteger — e esse é exatamente o momento em que os riscos mudam de natureza. Decisões erradas, falta de proteção adequada, carteira mal posicionada para o próximo ciclo econômico: esses são os desafios reais de quem já construiu.\n\nUma estratégia completa garante não apenas que você chegue lá, mas que se mantenha lá — com eficiência, proteção e a tranquilidade de saber que o futuro da sua família está resguardado, independente do que aconteça.`;
    }

    if (area === "inv") return "";

    if (area === "blind") {
      return gerarTextoBlindagem();
    }

    return "";
  }

  return (
    <>
      <style>{`
        @media print {
          .diag-no-print { display: none !important; }
          body { background: white !important; }
          .diag-print-root { padding: 0 !important; }
        }
      `}</style>

      <div className="diag-print-root">

        {/* ── Header com score geral ── */}
        <div style={{
          background: "white",
          border: "0.5px solid #E5E7EB",
          borderRadius: 12,
          padding: "24px 28px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{
              fontSize: 10,
              color: "#9CA3AF",
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              marginBottom: 4,
            }}>
              Diagnóstico Financeiro
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
              {lead.nome}
            </div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
              {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ textAlign: "center" as const }}>
            <div style={{
              fontSize: 52, fontWeight: 900, lineHeight: 1,
              color: nivelScore(scoreGeral).cor,
            }}>
              {scoreGeral}
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>
              de 100 pontos
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: nivelScore(scoreGeral).cor,
              background: nivelScore(scoreGeral).bg,
              padding: "3px 12px", borderRadius: 99,
              display: "inline-block",
            }}>
              {nivelScore(scoreGeral).label}
            </span>
          </div>
        </div>

        {/* ── 3 Gauges ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
          <GaugeDiag score={scoreLF}           label="Liberdade Financeira"    icone="ti-beach"     nivel={nivelScore(scoreLF)} />
          <GaugeDiag score={scoreInvestimentos} label="Investimentos"           icone="ti-chart-pie" nivel={nivelScore(scoreInvestimentos)} />
          <GaugeDiag score={scoreBlindagem}     label="Blindagem de Patrimônio" icone="ti-shield"    nivel={nivelScore(scoreBlindagem)} />
        </div>

        {/* ── 3 Cards analíticos ── */}
        {[
          { area: "lf",    score: scoreLF,             icone: "ti-beach",     titulo: "Liberdade Financeira" },
          { area: "inv",   score: scoreInvestimentos,   icone: "ti-chart-pie", titulo: "Investimentos" },
          { area: "blind", score: scoreBlindagem,       icone: "ti-shield",    titulo: "Blindagem de Patrimônio" },
        ].map(({ area, score, icone, titulo }) => (
          <div key={area} style={{
            background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12,
            padding: "20px 24px", marginBottom: 16,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16, paddingBottom: 12, borderBottom: "0.5px solid #F3F4F6",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className={`ti ${icone}`} style={{ fontSize: 18, color: "#2563EB" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{titulo}</span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: nivelScore(score).cor, background: nivelScore(score).bg,
                padding: "3px 10px", borderRadius: 99,
              }}>
                {nivelScore(score).label}
              </span>
            </div>
            {area === "inv" ? renderConteudoInvestimentos() : (
              <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.9, margin: 0, whiteSpace: "pre-line", textAlign: "justify" as const }}>
                {gerarTexto(area)}
              </p>
            )}
          </div>
        ))}

      </div>
    </>
  );
}
