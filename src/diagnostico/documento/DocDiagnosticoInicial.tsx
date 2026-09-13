import type { Lead } from "../types";
import { nivelScore, calcularScoresDiag } from "../scoresDiag";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

function GaugeDiag({
  score, label, icone, nivel,
}: {
  score: number; label: string; icone: string;
  nivel: ReturnType<typeof nivelScore>;
}) {
  const W = 130, H = 70;
  const CX = W / 2, CY = H;
  const R_EXT = 56, R_INT = 40;
  const sc = Math.max(0, Math.min(100, score));
  const graus = 180 - (sc / 100) * 180;
  const rad = (graus * Math.PI) / 180;
  const xFimExt = CX + R_EXT * Math.cos(rad);
  const yFimExt = CY - R_EXT * Math.sin(rad);
  const xFimInt = CX + R_INT * Math.cos(rad);
  const yFimInt = CY - R_INT * Math.sin(rad);
  const largeArc = 0;

  const pathFundo = [
    `M ${CX - R_EXT} ${CY}`, `A ${R_EXT} ${R_EXT} 0 0 1 ${CX + R_EXT} ${CY}`,
    `L ${CX + R_INT} ${CY}`, `A ${R_INT} ${R_INT} 0 0 0 ${CX - R_INT} ${CY}`, "Z",
  ].join(" ");

  const pathFill = sc > 0 ? [
    `M ${CX - R_EXT} ${CY}`,
    `A ${R_EXT} ${R_EXT} 0 ${largeArc} 1 ${xFimExt} ${yFimExt}`,
    `L ${xFimInt} ${yFimInt}`,
    `A ${R_INT} ${R_INT} 0 ${largeArc} 0 ${CX - R_INT} ${CY}`, "Z",
  ].join(" ") : "";

  return (
    <div style={{
      background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12,
      padding: "12px 10px 10px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <svg width={W} height={H + 10} viewBox={`0 0 ${W} ${H + 10}`} style={{ overflow: "visible" }}>
        <path d={pathFundo} fill="#F3F4F6" />
        {sc > 0 && <path d={pathFill} fill={nivel.cor} opacity={0.9} />}
        <text x={CX} y={CY - 8} textAnchor="middle" fontSize="18" fontWeight="800"
          fill={score >= 0 ? nivel.cor : "#9CA3AF"}>
          {score >= 0 ? sc : "—"}
        </text>
        <text x={CX} y={CY + 5} textAnchor="middle" fontSize="9" fill="#9CA3AF">/100</text>
      </svg>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
        <i className={`ti ${icone}`} style={{ fontSize: 13, color: nivel.cor }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: "#374151", textAlign: "center" as const }}>
          {label}
        </span>
      </div>
      <span style={{
        fontSize: 9, fontWeight: 600, color: nivel.cor, background: nivel.bg,
        padding: "2px 10px", borderRadius: 99, marginTop: 4,
      }}>
        {nivel.label}
      </span>
    </div>
  );
}

interface Props { lead: Lead; }

export function DocDiagnosticoInicial({ lead }: Props) {
  const { dadosColeta } = lead;
  const nome = lead.nome.split(" ")[0];

  const {
    scoreLF, scoreInvestimentos: scoreInv, scoreBlindagem: scoreBlind, scoreGeral,
  } = calcularScoresDiag(dadosColeta);

  const nv = nivelScore(scoreGeral);

  const filhos      = Array.isArray(dadosColeta.filhos) ? dadosColeta.filhos : [];
  const temFilhos   = filhos.length > 0;
  const estadoCivil = dadosColeta.estadoCivil ?? "";
  const casado      = estadoCivil === "casado" || estadoCivil === "uniao_estavel";
  const conjuge     = dadosColeta.nomeConjuge?.trim() || "";
  const conjugeRef  = conjuge || (casado ? "sua família" : "");

  const vinculos: string[] = Array.isArray(dadosColeta.vinculoProfissional)
    ? dadosColeta.vinculoProfissional
    : dadosColeta.vinculoProfissional ? [dadosColeta.vinculoProfissional] : [];
  const ehAutonomo   = vinculos.includes("autonomo");
  const ehEmpresario = vinculos.includes("empresario");
  const ehServidor   = vinculos.includes("servidor");

  const scoresPilar = [
    { nome: "Liberdade Financeira", score: scoreLF },
    { nome: "Investimentos", score: scoreInv },
    { nome: "Blindagem de Patrimônio", score: scoreBlind },
  ];
  const pilarFraco = scoresPilar.reduce((a, b) => b.score < a.score ? b : a);
  const pilarNome  = pilarFraco.nome;
  const isInvest   = pilarNome === "Investimentos";

  const filhosRef = filhos.length === 1
    ? (filhos[0].nome || "seu filho")
    : filhos.length > 1 ? `seus ${filhos.length} filhos` : "";

  // P1 — score-adaptive opener
  let p1: string;
  if (scoreGeral >= 80) {
    p1 = `${nome}, poucos chegam a um diagnóstico com os números que você apresenta. Você construiu uma base sólida, com disciplina e consistência — e esse documento é o reconhecimento disso, mas também o mapa para o que ainda pode ser otimizado.`;
  } else if (scoreGeral >= 60) {
    p1 = `${nome}, você está segurando em mãos algo que poucas pessoas têm coragem de buscar: a verdade sobre a própria situação financeira. E o que esses números mostram é que você já está à frente da maioria — mas ainda há distância importante entre onde você está e onde poderia estar.`;
  } else if (scoreGeral >= 40) {
    p1 = `${nome}, você está segurando em mãos algo que poucas pessoas têm coragem de buscar: a verdade sobre a própria situação financeira. Esses números mostram que há trabalho importante a fazer — e que o momento de começar é agora, não depois.`;
  } else {
    p1 = `${nome}, o que você está segurando em mãos não é só um diagnóstico — é o primeiro olhar honesto sobre uma realidade que não pode mais ser postergada. Isso exige coragem, e o fato de você estar aqui já diferencia você da maioria.`;
  }

  // P2 — context for the journey (different tone for Caminho Certo)
  const p2 = scoreGeral >= 80
    ? `Quem já chegou até aqui sabe que a diferença entre bom e excelente raramente está em fazer mais — está em fazer com mais eficiência. Uma carteira melhor posicionada, decisões mais informadas, proteção calibrada para a realidade atual: esses ajustes têm impacto composto ao longo dos anos, e é exatamente isso que esse diagnóstico mapeia.`
    : `A maioria das pessoas vive anos — décadas — sem jamais parar para olhar de frente para os números que vão definir o futuro delas. Evitam essa conversa porque ela exige honestidade. Porque ela revela que o tempo passa, que as decisões têm consequências, e que adiar é uma escolha — com um custo real que ninguém coloca no extrato.`;

  // P3 — three pillars + weakest named + family + profession
  let familiaP3 = "";
  if (casado && temFilhos) {
    const fRef = filhosRef || "seus filhos";
    familiaP3 = conjugeRef ? ` para ${conjugeRef} e ${fRef}` : ` para ${fRef}`;
  } else if (casado) {
    familiaP3 = conjugeRef ? ` para você e ${conjugeRef}` : "";
  } else if (temFilhos && filhosRef) {
    familiaP3 = ` para ${filhosRef}`;
  }

  const baseP3 = `Este diagnóstico analisou três pilares fundamentais: a sua jornada rumo à liberdade financeira, a qualidade dos seus investimentos, e a proteção que garante que tudo o que você está construindo${familiaP3} continuará existindo independente do que aconteça.`;

  let p3: string;
  if (ehAutonomo && scoreGeral < 80) {
    p3 = `${baseP3} Como autônomo, é especialmente importante estruturar bem esses pilares — e dos três, ${isInvest ? "os" : "a"} ${pilarNome} ${isInvest ? "são" : "é"} o ponto que exige atenção imediata.`;
  } else if (ehServidor && scoreGeral < 80) {
    p3 = `${baseP3} Como servidor público, há especificidades importantes em cada um desses pilares — e dos três, ${isInvest ? "os" : "a"} ${pilarNome} ${isInvest ? "são" : "é"} o ponto de maior atenção imediata.`;
  } else if (scoreGeral >= 80) {
    p3 = `${baseP3} Dos três, ${isInvest ? "os" : "a"} ${pilarNome} ${isInvest ? "representam" : "representa"} a maior oportunidade de melhoria — com ajustes que podem ter impacto significativo no longo prazo${isInvest ? " sem necessariamente aportar mais" : ""}.`;
  } else if (scoreGeral <= 39) {
    p3 = `${baseP3} Dos três, ${isInvest ? "os" : "a"} ${pilarNome} é o ponto de maior atenção imediata — e é por onde qualquer estratégia séria precisa começar.`;
  } else {
    p3 = `${baseP3} Dos três, ${isInvest ? "os" : "a"} ${pilarNome} é o ponto de maior atenção imediata.`;
  }

  // P4 — compass (unchanged)
  const p4 = `O resultado que você vê acima não é um julgamento. É uma bússola. Ele mostra onde você está hoje — e mais importante do que isso, revela o caminho para onde você precisa chegar. A pontuação não é o destino: é o ponto de partida.`;

  // P5 — juros compostos (shortened; tone adjusted for Caminho Certo)
  const p5 = scoreGeral >= 80
    ? `Quem já construiu não tem o luxo de deixar o trabalho parar. Cada mês com uma estratégia de investimentos abaixo do potencial é um mês em que os juros compostos estão trabalhando com menos eficiência do que poderiam. Esse custo não aparece no extrato — mas se acumula ao longo dos anos.`
    : `Clareza sem ação não transforma nada. O maior erro após um diagnóstico como este é guardar esse documento na gaveta. Cada mês sem uma estratégia estruturada é um mês em que os juros compostos não estão trabalhando para você — e esse custo se acumula silenciosamente até se tornar cada vez mais difícil de recuperar.`;

  // P6 — personalized closing with family names + profession note
  const notaProfP6 = ehEmpresario
    ? ` Como empresário, você sabe que nenhum resultado relevante vem sem um plano claro e sem execução consistente. A sua estratégia financeira não é diferente.`
    : ehAutonomo
      ? ` Como autônomo, esse futuro é possível — mas exige um plano construído com mais atenção do que a maioria das pessoas percebe.`
      : ` Esse futuro não se constrói sozinho. Ele é resultado de decisões tomadas hoje, com consistência e com acompanhamento.`;

  let p6: string;
  if (scoreGeral >= 80) {
    if (casado && temFilhos) {
      const fRef = filhosRef || "seus filhos";
      p6 = `Pense em ${conjugeRef || "sua família"} e em ${fRef}. O que você já construiu para eles é considerável — e o que está neste documento é o que pode torná-lo ainda mais sólido, eficiente e protegido. Esse futuro não se mantém sozinho: ele é resultado de decisões tomadas com consistência e com o acompanhamento certo.`;
    } else if (casado) {
      p6 = `Pense em você e em ${conjugeRef || "sua família"}. O que vocês já construíram é considerável — e o que está neste documento é o que pode torná-lo ainda mais sólido, eficiente e protegido. Esse futuro não se mantém sozinho: ele é resultado de decisões tomadas com consistência e com o acompanhamento certo.`;
    } else if (temFilhos) {
      p6 = `Pense em ${filhosRef || "seus filhos"}. O que você já construiu para eles é considerável — e o que está neste documento é o que pode torná-lo ainda mais sólido, eficiente e protegido. Esse futuro não se mantém sozinho: ele é resultado de decisões tomadas com consistência e com o acompanhamento certo.`;
    } else {
      p6 = `O que você já construiu é considerável — e o que está neste documento é o que pode torná-lo ainda mais sólido, eficiente e protegido. Esse futuro não se mantém sozinho: ele é resultado de decisões tomadas com consistência e com o acompanhamento certo.`;
    }
  } else if (casado && temFilhos) {
    const fRef = filhosRef || "seus filhos";
    p6 = `Pense em ${conjugeRef || "sua família"} e em ${fRef}. Pense no futuro que você quer construir para eles — a educação, a segurança, a tranquilidade de saber que, aconteça o que acontecer, eles estarão protegidos.${notaProfP6}`;
  } else if (casado) {
    p6 = `Pense em você e em ${conjugeRef || "sua família"}. Pense no futuro que imaginam juntos — a liberdade de fazer escolhas sem a pressão financeira, a tranquilidade que planejam.${notaProfP6}`;
  } else if (temFilhos) {
    const fRef = filhosRef || "seus filhos";
    p6 = `Pense em ${fRef}. Pense no futuro que você quer construir para eles — a educação, a segurança, a tranquilidade de saber que, aconteça o que acontecer, eles estarão protegidos.${notaProfP6}`;
  } else {
    p6 = `Pense no futuro que você imagina — a liberdade de acordar sem a pressão do trabalho por obrigação, de fazer escolhas com base no que deseja, não no que precisa.${notaProfP6}`;
  }

  const textoEmocional = [p1, p2, p3, p4, p5, p6, `Os próximos passos estão mapeados neste documento. A jornada começa agora.`].join("\n\n");

  const blocos: BlocoDoc[] = [
    {
      chave: "hero",
      grudaNoProximo: true,
      node: (
        <>
          <div style={{
            background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12,
            padding: "14px 20px", marginBottom: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 3 }}>
                Diagnóstico Financeiro
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{lead.nome}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
                {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </div>
            </div>
            <div style={{ textAlign: "center" as const }}>
              <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, color: nv.cor }}>{scoreGeral}</div>
              <div style={{ fontSize: 10, color: "#9CA3AF" }}>de 100 pontos</div>
              <span style={{
                fontSize: 10, fontWeight: 700, color: nv.cor, background: nv.bg,
                padding: "2px 10px", borderRadius: 99, display: "inline-block",
              }}>
                {nv.label}
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            <GaugeDiag score={scoreLF}    label="Liberdade Financeira"    icone="ti-beach"     nivel={nivelScore(scoreLF)} />
            <GaugeDiag score={scoreInv}   label="Investimentos"           icone="ti-chart-pie" nivel={nivelScore(scoreInv)} />
            <GaugeDiag score={scoreBlind} label="Blindagem de Patrimônio" icone="ti-shield"    nivel={nivelScore(scoreBlind)} />
          </div>
        </>
      ),
    },
    {
      chave: "texto",
      node: (
        <p style={{
          fontSize: 12,
          color: "#374151",
          lineHeight: 2,
          margin: "12px 0 0",
          whiteSpace: "pre-line" as const,
          textAlign: "justify" as const,
        }}>
          {textoEmocional}
        </p>
      ),
    },
  ];

  return (
    <PaginaDocFluidaDiag
      titulo="Diagnóstico Inicial"
      nomeCliente={lead.nome}
      blocos={blocos}
    />
  );
}
