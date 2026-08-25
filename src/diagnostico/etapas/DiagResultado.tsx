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
    blindagemTemDados, possuiSeguro,
    comecandoDoZero,
  } = calcularScoresDiag(dadosColeta);

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

        {blocos.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 10 }}>
              Avaliação por ativo
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: 20 }}>
              {blocos.map(b => (
                <div key={b.chave} style={{
                  borderLeft: `3px solid ${b.nivel.border}`,
                  paddingLeft: 12,
                  background: b.nivel.bg,
                  borderRadius: "0 8px 8px 0",
                  padding: "10px 14px 10px 14px",
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
      if (!blindagemTemDados) {
        return "Não conseguimos avaliar sua proteção patrimonial sem saber suas despesas mensais. Complete esse dado para descobrir se sua família estaria protegida em caso de imprevistos.";
      }
      if (!possuiSeguro) {
        return "Você não possui nenhuma apólice de seguro de vida ou invalidez — o que significa que, se algo inesperado acontecer com você amanhã, sua família enfrentaria a dor emocional e, simultaneamente, uma crise financeira devastadora.\n\nPense nisso de forma concreta: em caso de falecimento, quem pagaria o aluguel, a escola dos filhos, as contas do dia a dia? Em caso de invalidez — que é estatisticamente mais provável do que o falecimento precoce — como sua família manteria o padrão de vida por meses ou anos sem a sua renda?\n\nUm seguro de vida adequado é uma das decisões mais importantes e mais acessíveis que você pode tomar hoje. O custo de não ter é infinitamente maior do que o custo de ter.";
      }
      return "Você já deu um passo importante ao contratar um seguro de vida ou invalidez. Isso demonstra consciência sobre a proteção da sua família.\n\nPara uma análise mais precisa do quanto essa cobertura representa frente às necessidades reais, recomendamos levantar o valor exato das apólices. Na reunião inicial, vamos mapear se a cobertura atual é suficiente ou se há lacunas a preencher.";
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
