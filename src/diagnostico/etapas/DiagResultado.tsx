import type { Lead } from "../types";
import { nivelScore, calcularScoresDiag } from "../scoresDiag";

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
    aaTemDados, ativosBonsLabels, nBonsCount, nRuinsCount,
    temRV, temExt,
    blindagemTemDados, possuiSeguro,
    comecandoDoZero,
  } = calcularScoresDiag(dadosColeta);

  const nome = lead.nome.split(" ")[0];

  function gerarTextoInvestimentos(): string {
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

    const am = dadosColeta.ativosInvestimento ?? {};
    const tem = (id: string) => am[id] === true;
    const partes: string[] = [];

    // Ativos bons
    if (nBonsCount > 0) {
      partes.push(`Sua carteira já conta com ativos de qualidade — ${ativosBonsLabels.join(", ")}. Isso demonstra que você já tomou boas decisões de investimento e tem uma base sólida para continuar construindo.`);
    }

    // Poupança
    if (tem("poupanca")) {
      partes.push(`A poupança é um dos pontos que mais chama atenção. Embora seja segura e familiar, sua rentabilidade é limitada por lei e, na prática, costuma perder para a inflação no longo prazo. Existem alternativas igualmente seguras — com proteção do FGC — que rendem significativamente mais, como o Tesouro Selic e CDBs de liquidez diária. Essa troca é uma das mudanças mais simples e impactantes que você pode fazer agora.`);
    }

    // Produtos complexos/opacos
    const prodComplexos: Record<string, string> = {
      coe: "COE",
      produto_estruturado: "Produtos Estruturados",
      fundo_cetipado: "Fundos Cetipados",
    };
    const complexosPresentes = Object.keys(prodComplexos).filter(id => tem(id));
    if (complexosPresentes.length > 0) {
      const nomes = complexosPresentes.map(id => prodComplexos[id]).join(", ");
      partes.push(`Alguns produtos da sua carteira — ${nomes} — possuem estruturas complexas que, na maioria dos casos, favorecem mais a instituição financeira do que o investidor. Baixa transparência, liquidez reduzida e custos embutidos são características que merecem atenção.`);
    }

    // Fundos alternativos
    if (tem("fundo_alternativo")) {
      partes.push(`Fundos alternativos sem histórico robusto ou de gestoras pouco conhecidas representam risco sem a devida contrapartida de retorno. Vale avaliar com cuidado o que justifica essa alocação.`);
    }

    // Fundos de ações
    if (tem("fundo_acoes")) {
      partes.push(`Fundos de ações com taxas elevadas ou desempenho abaixo do Ibovespa de forma consistente destroem valor. Em muitos casos, ETFs de índice com taxas menores entregam resultados superiores no longo prazo.`);
    }

    // Fundos multimercado
    if (tem("fundo_multimercado")) {
      partes.push(`Fundos multimercado com taxas elevadas ou sem histórico consistente de retorno podem consumir boa parte do rendimento. A escolha do gestor é fundamental nessa categoria.`);
    }

    // Fiagro
    if (tem("fiagro")) {
      partes.push(`Fiagros ainda são uma classe relativamente nova, com histórico curto e riscos ligados ao setor agrícola que a maioria dos investidores tem dificuldade de avaliar. Avalie com cuidado a qualidade da carteira e a gestora antes de alocar recursos.`);
    }

    // CRI/CRA e Debêntures
    const creditLabels: Record<string, string> = { cri_cra: "CRI/CRA", debentures: "Debêntures" };
    const creditPresentes = Object.keys(creditLabels).filter(id => tem(id));
    if (creditPresentes.length > 0) {
      const nomes = creditPresentes.map(id => creditLabels[id]).join(" e ");
      partes.push(`${nomes} não contam com proteção do FGC e têm liquidez reduzida no mercado secundário. É essencial avaliar a qualidade de crédito do emissor e manter a exposição dentro de um percentual adequado ao seu perfil.`);
    }

    // Apenas renda fixa, sem RV nem exterior
    if (nRuinsCount === 0 && !temRV && !temExt) {
      partes.push(`Uma carteira concentrada apenas em renda fixa tem um custo de oportunidade real no longo prazo. Sem ativos de crescimento — como ações e fundos imobiliários — e sem diversificação internacional, o patrimônio tende a crescer significativamente abaixo do seu potencial. Você já tem a base — agora é hora de construir sobre ela.`);
    }

    // Encerramento
    partes.push(`Uma carteira bem estruturada não é apenas sobre escolher bons produtos — é sobre ter cada ativo cumprindo um papel específico, com diversificação adequada e custos sob controle. Pequenos ajustes na composição atual podem representar uma diferença significativa no resultado de longo prazo.`);

    return partes.join("\n\n");
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

    if (area === "inv") return gerarTextoInvestimentos();

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
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.9, margin: 0, whiteSpace: "pre-line" }}>
              {gerarTexto(area)}
            </p>
          </div>
        ))}

      </div>
    </>
  );
}
