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
    possuiSeguro,
    comecandoDoZero,
  } = calcularScoresDiag(dadosColeta);

  const casado    = dadosColeta.estadoCivil === "casado" || dadosColeta.estadoCivil === "uniao_estavel";
  const conjuge   = dadosColeta.nomeConjuge ?? "";
  const filhos    = dadosColeta.filhos ?? [];
  const temFilhos = filhos.length > 0;

  const vinculos: string[] = Array.isArray(dadosColeta.vinculoProfissional)
    ? dadosColeta.vinculoProfissional
    : dadosColeta.vinculoProfissional ? [dadosColeta.vinculoProfissional] : [];
  const ehAutonomo    = vinculos.includes("autonomo");
  const ehEmpresario  = vinculos.includes("empresario");
  const ehCLT         = vinculos.includes("clt");
  const ehServidor    = vinculos.includes("servidor");
  const rendaVariavel = ehAutonomo || ehEmpresario;

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
    const temRFPilar     = ["tesouro_selic","fundo_rf","lci_lca","cri_cra","debentures","poupanca","cdb"].some(tem);
    const temAcoesPilar  = tem("acoes");
    const temFIIsPilar   = tem("fiis");
    const temGlobalPilar = ["renda_fixa_eua","stocks","reits","etfs_exterior","cripto"].some(tem);

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

    const imeta = Number(dadosColeta.idadeMeta) || 0;
    const nascStr = dadosColeta.dataNascimento || "";
    const anosRest = (() => {
      if (!nascStr || imeta <= 0) return 0;
      const hoje = new Date();
      let ano = 0, mes = 0;
      if (nascStr.includes('-')) { [ano, mes] = nascStr.split('-').map(Number); }
      else { ano = parseInt(nascStr.slice(6)); mes = parseInt(nascStr.slice(3, 5)); }
      const idade = hoje.getFullYear() - ano + ((hoje.getMonth() + 1) < mes ? -1 : 0);
      return imeta > idade ? imeta - idade : 0;
    })();
    const horizonte = anosRest > 0 ? ` no seu horizonte de ${anosRest} anos` : "";

    if (!temRFPilar && count > 0) {
      return `A sua carteira não contempla renda fixa. Essa é a classe que cumpre duas funções que nenhuma outra cumpre: dar previsibilidade ao dinheiro que você vai precisar no curto prazo e oferecer liquidez diante de imprevistos. Sem ela, qualquer necessidade de caixa se transforma em venda de ativo de risco, frequentemente no pior momento possível. É também a renda fixa que permite manter as posições de risco com tranquilidade, porque você deixa de depender delas para viver.`;
    }
    if (count === 0) {
      return `Nenhum ativo foi mapeado. Para analisar a diversificação da sua carteira, preencha os investimentos na etapa de coleta.`;
    }
    if (count === 1) {
      return `${nome}, a sua carteira está concentrada em ${classesPresentes[0]}. Hoje, todo o seu resultado depende de um único tipo de ativo e, portanto, de um único cenário econômico. Concentração não é apenas risco de perda: é também um limite. Enquanto todas as suas fontes de resultado forem a mesma, o patrimônio não consegue combinar segurança, crescimento e renda ao mesmo tempo.`;
    }
    if (count === 2) {
      const listPresentes = classesPresentes.join(" e ");
      const listAusentes = classesAusentes.length === 2
        ? `${classesAusentes[0]} e ${classesAusentes[1]}`
        : classesAusentes.join(" e ");
      return `${nome}, a sua carteira contempla duas das quatro classes analisadas: ${listPresentes}. É um começo de estrutura, mas com funções relevantes ainda descobertas: falta ${listAusentes}${horizonte}. Na prática, você já resolveu uma parte do problema e deixou outra inteira em aberto.`;
    }
    if (count === 3) {
      const ausenteLabel = classesAusentes[0];
      const funcaoAusente: Record<string, string> = {
        "Renda Fixa":            "segurança e liquidez para o curto prazo",
        "Ações":                 "crescimento de longo prazo",
        "Fundos Imobiliários":   "renda recorrente e exposição a ativos reais",
        "Investimentos Globais": "proteção contra o risco-país e o risco de moeda",
      };
      return `${nome}, a sua carteira contempla três das quatro classes analisadas, o que mostra que você já pensa em alocação e não apenas em produto. A lacuna está em ${ausenteLabel}, responsável por ${funcaoAusente[ausenteLabel] ?? "diversificação adicional"}. Em uma estrutura que já é boa, essa é a lacuna de maior ganho relativo: não se trata de refazer o que está feito, e sim de completar o que falta e revisar as proporções.`;
    }
    return `${nome}, a sua carteira contempla as quatro classes analisadas, o que é pouco comum e indica intenção clara de estrutura. É importante registrar, porém, o limite deste indicador: ele mede presença, não proporção. Ter as quatro classes não garante que os pesos entre elas correspondam ao seu perfil, ao seu prazo e ao seu objetivo, e é a proporção que determina como a carteira se comporta em cenários adversos.`;
  }

  const textoPrevidencia = `A previdência privada oferece dois benefícios relevantes para o planejamento de longo prazo: a sucessão patrimonial simplificada — os recursos são transferidos diretamente aos beneficiários sem necessidade de inventário — e o diferimento fiscal, já que o imposto incide apenas no momento do resgate, permitindo que o capital cresça sem tributação intermediária. No caso do PGBL, há ainda a possibilidade de deduzir até 12% da renda bruta anual na declaração completa do IR.\n\nO ponto de atenção está na qualidade do fundo onde o patrimônio está aplicado. Muitos planos comercializados por bancos concentram os recursos em fundos com taxas de administração elevadas e desempenho abaixo do CDI — o que pode comprometer boa parte dos benefícios fiscais. A vantagem da previdência só se concretiza com um fundo de qualidade, com taxa baixa e gestão eficiente.`;

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
    const ativosDoLead = ATIVOS_INVESTIMENTO.filter(a => am[a.id] === true && a.classe !== "previdencia");
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
      { label: "Renda Fixa",            icone: "ti-building-bank", ok: ["tesouro_selic","fundo_rf","lci_lca","cri_cra","debentures","poupanca","cdb"].some(tem) },
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

        {(dadosColeta.temPrevidencia || dadosColeta.ativosInvestimento?.["previdencia_privada"] === true) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 10 }}>
              Previdência Privada
            </div>
            <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.8, margin: 0, textAlign: "justify" as const, whiteSpace: "pre-line" as const }}>
              {textoPrevidencia}
            </p>
          </div>
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
    const conjugeRef = conjuge || "sua família";
    const tipoProf   = ehEmpresario ? "empresário" : ehAutonomo ? "autônomo" : "";

    const introBlindagem = `Existe uma regra pétrea no planejamento financeiro: não adianta desenharmos a melhor estratégia de investimentos do mundo se a base sobre a qual ela está construída for vulnerável. Um único evento inesperado não planejado pode desmanchar anos de acumulação em poucos meses. Por isso, analisamos a sua blindagem patrimonial.`;

    // Parágrafo extra de profissão para quem não tem seguro
    const notaRendaVariavel = rendaVariavel
      ? `\n\nComo ${tipoProf}, se você para, a receita para junto — sem salário garantido nem afastamento remunerado pelo empregador.${ehEmpresario ? " Há um risco adicional: a sua ausência pode comprometer a empresa inteira — sócios, contratos, funcionários. Um seguro de pessoa-chave protege tanto a família quanto a continuidade do negócio." : " Uma apólice com DIT (Diária de Incapacidade Temporária) e cobertura de invalidez parcial é o que garante renda quando você não pode trabalhar."}`
      : ehCLT
        ? `\n\nComo empregado CLT, você tem alguns benefícios institucionais — mas o que o INSS oferece em casos de invalidez raramente mantém o padrão de vida de quem era ativo. O auxílio-doença e a aposentadoria por invalidez cobrem uma fração da renda real, e durante um afastamento prolongado a diferença precisa vir de algum lugar.`
        : ehServidor
          ? `\n\nComo servidor público, você tem estabilidade — mas em casos de doença grave ou invalidez permanente, os limites do regime público costumam surpreender negativamente. Coberturas complementares fazem a diferença entre manter o padrão de vida ou ter que renegociá-lo por completo.`
          : "";

    if (!possuiSeguro) {
      if (temFilhos) {
        return `${introBlindagem}\n\n${nome}, hoje você não possui uma apólice de blindagem. Se amanhã um imprevisto grave tirar a sua capacidade de gerar renda ou tirar você de cena, quem paga a escola ${filhos.length === 1 ? "das crianças" : "das crianças"} no mês seguinte? Quem banca as contas fixas da casa enquanto as coisas se reorganizam? Sem uma cobertura estruturada, a família é obrigada a torrar as reservas e liquidar investimentos na pressa.${notaRendaVariavel}\n\nTerceirizar esse risco para uma seguradora é o pilar mais urgente antes de qualquer aporte.`;
      }
      if (casado) {
        return `${introBlindagem}\n\nHoje o patrimônio de vocês não tem blindagem. Se um evento de saúde afastar você do trabalho por um ano, o dinheiro que você e ${conjugeRef} juntaram para construir a vida a dois começará a ser drenado imediatamente para pagar tratamentos e despesas correntes. O que era projeto de independência vira fundo de sobrevivência médica.${notaRendaVariavel}\n\nUma apólice estruturada serve exatamente para impedir que ${conjugeRef} fique desamparado${conjuge ? "" : "a"}.`;
      }
      return `${introBlindagem}\n\n${nome}, mesmo sem dependentes, a ausência de seguro é o maior risco da sua independência financeira. Se um acidente ou diagnóstico grave te impedir de trabalhar temporariamente, de onde sairá o dinheiro para pagar seu custo de vida e os médicos? Dos investimentos que você suou anos para acumular.${notaRendaVariavel}\n\nA blindagem pessoal de DIT e doenças graves existe para garantir que você nunca precise queimar o seu próprio patrimônio para se manter em pé.`;
    }

    // Tem seguro — nota específica por profissão para revisão da cobertura
    const notaSeguroProfissao = ehEmpresario
      ? `\n\nComo empresário, há um ponto adicional que muitas vezes passa despercebido: o seguro de vida pessoal raramente cobre o risco que a sua ausência representa para a empresa — sócios, funcionários, contratos em andamento. Um seguro de pessoa-chave, estruturado corretamente, protege tanto a sua família quanto a continuidade do negócio que você construiu.`
      : ehAutonomo
        ? `\n\nComo autônomo, além da cobertura de vida, a proteção de renda por invalidez ou incapacidade temporária é especialmente crítica — porque sem você trabalhando, não há renda entrando. Verificar se a sua apólice inclui cobertura de invalidez total e parcial e DIT (Diária de Incapacidade Temporária) pode fazer uma diferença enorme em um cenário de afastamento.`
        : "";

    return `${introBlindagem}\n\n${nome}, você já deu um passo importante ao ter uma apólice contratada. O nosso foco agora é calibrar: será que o capital segurado contratado lá atrás ainda acompanha o custo de vida e o patrimônio que você tem hoje? Na idade ativa, é mais comum um imprevisto afastar alguém do trabalho do que tirá-lo de cena — e é exatamente esse cenário que muitas apólices não cobrem adequadamente.${notaSeguroProfissao}\n\nAlém disso, é fundamental verificar se a sua cobertura vai além do falecimento e inclui invalidez, doenças graves e DIT (Diária de Incapacidade Temporária). Ter a ferramenta certa descalibrada dá uma falsa sensação de segurança.\n\nPor fim, no Brasil o processo de inventário é burocrático, lento e custoso. Um planejamento sucessório estruturado garante que o patrimônio seja transmitido da forma mais eficiente possível.`;
  }

  function gerarTexto(area: string): string {
    if (area === "lf") {
      // Referências de família personalizadas
      const nFilhosStr  = filhos.length === 1 ? (filhos[0].nome || "seu filho") : `seus ${filhos.length} filhos`;
      const conjugeRef  = conjuge || "sua família";
      const familiaLF   = casado && temFilhos
        ? `você, ${conjugeRef} e ${nFilhosStr}`
        : casado
          ? `você e ${conjugeRef}`
          : temFilhos
            ? `você e ${nFilhosStr}`
            : "você";
      const aposFamiliaRef = casado && temFilhos
        ? `para ${conjugeRef} e ${nFilhosStr}`
        : casado
          ? `para ${conjugeRef}`
          : temFilhos
            ? `para ${nFilhosStr}`
            : "";
      const sonhosFamilia = temFilhos
        ? casado
          ? `A viagem que ${familiaLF} sempre adiou. A melhor escola ${filhos.length === 1 ? "para" : "para"} ${nFilhosStr}. A faculdade sem preocupação financeira. A possibilidade de ${conjugeRef} também ter mais liberdade.`
          : `A melhor escola ${filhos.length === 1 ? "para" : "para"} ${nFilhosStr}. A faculdade sem aperto financeiro. Estar presente nos momentos que ${filhos.length === 1 ? "ele precisar" : "eles precisarem"}.`
        : casado
          ? `As viagens que vocês planejaram. A liberdade de ${conjugeRef} também ter opções. A aposentadoria que imaginam juntos.`
          : "As viagens que sempre adiou. A liberdade de trabalhar por escolha, não por obrigação. A vida que imagina para daqui a 20 anos.";

      // Nota de profissão para os textos de LF
      const notaProfLF = rendaVariavel
        ? `\n\nComo ${ehEmpresario ? "empresário" : "autônomo"}, a sua renda tem uma característica que torna o planejamento ainda mais urgente: ela é variável. Não há 13º, não há FGTS, não há renda passiva garantida pelo empregador. Isso significa que a construção do seu patrimônio depende exclusivamente da sua disciplina e da estratégia que você montar — e que cada ano sem um plano estruturado tem um custo muito maior do que para a maioria das pessoas.`
        : ehServidor
          ? `\n\nComo servidor público, você tem uma base de segurança que poucos têm — mas a aposentadoria pelo regime público raramente mantém o padrão de vida de quem estava na ativa. A diferença entre o que o RPPS garante e o que você imagina como "aposentadoria ideal" é exatamente o que precisa ser planejado e construído agora.`
          : "";

      const introLF = `A nossa liberdade financeira começa quando colocamos números concretos nos nossos objetivos. A maioria das pessoas trabalha a vida inteira sem saber exatamente quanto custa a sua independência: quanto precisa ter para parar quando quiser, viajar sem culpa ou simplesmente acordar sem a obrigação financeira de bater cartão. O nosso papel aqui foi calcular exatamente onde a sua estrutura atual te leva.`;

      let bandTextLF: string;
      if (pctIF >= 90) {
        bandTextLF = `${nome}, a sua estrutura atual indica que você tem consistência e patrimônio suficientes para bancar a sua independência com folga. Mas construir patrimônio é apenas a primeira metade do jogo; a segunda metade é proteger o que foi construído. Quando você chega nesse patamar, os riscos mudam de natureza: o foco sai de correr atrás de rentabilidade pura e passa a ser a blindagem contra cenários econômicos adversos e a eficiência fiscal/sucessória.`;
      } else if (pctIF > 50) {
        bandTextLF = `${nome}, parabéns pela disciplina. Você já cobre ${pctIF}% da sua meta, o que te coloca muito à frente da média. Porém, é justamente no "quase lá" que os erros custam mais caro. Uma carteira mal diversificada ou posicionada de forma ineficiente na reta final pode devolver anos de esforço. A nossa missão aqui é fechar essa lacuna final com segurança técnica.`;
      } else if (pctIF > 30) {
        bandTextLF = `${nome}, a sua projeção atual cobre ${pctIF}% da renda que você planejou para a aposentadoria. O significado prático disso é simples: sem ajustes, você chega lá com menos da metade do que precisa para sustentar a sua vida. A boa notícia é que a janela ainda está aberta. Pequenas otimizações na sua carteira e no seu fluxo de aportes hoje mudam radicalmente essa curva nos próximos 10 a 15 anos.`;
      } else {
        bandTextLF = `${nome}, preciso ser muito transparente com você: no ritmo atual, você atingirá apenas ${pctIF}% do que precisa. Isso significa que, lá na frente, você terá que tomar decisões amargas: reduzir padrão de vida, abrir mão de projetos essenciais ou continuar trabalhando por pura necessidade. O ponto não é se lamentar, mas entender que o tempo nos investimentos é insubstituível. Cada mês de atraso torna a rota mais cara e difícil de corrigir.`;
      }
      const lfOpener = `${introLF}\n\n${bandTextLF}\n\n`;

      if (!lfTemDados) {
        const filhosRef = temFilhos ? `, dar a melhor educação ${filhos.length === 1 ? `para ${nFilhosStr}` : `para ${nFilhosStr}`}` : "";
        return `A liberdade financeira começa com clareza — e clareza começa com números.\n\nA maioria das pessoas passa a vida trabalhando sem saber exatamente para quê: quanto precisa acumular para parar quando quiser, viajar sem culpa${filhosRef} ou simplesmente acordar de manhã sem a pressão de ter que trabalhar por necessidade.\n\nEssa falta de clareza não é inocente — ela tem um custo enorme. Cada ano sem um plano definido é um ano em que os juros compostos poderiam estar trabalhando a seu favor, mas não estão. Complete os seus dados e descubra onde você realmente está e o que precisa mudar para construir a vida que imagina${aposFamiliaRef ? ` ${aposFamiliaRef}` : ""}.`;
      }
      if (pctIF <= 30) {
        return `${lfOpener}Pense nos projetos que ${familiaLF} tem pela frente — ${sonhosFamilia} Tudo isso depende de um patrimônio que, com o ritmo atual, chegará a apenas ${pctIF}% do necessário. Isso significa escolhas dolorosas no futuro: abrir mão de projetos, reduzir o padrão de vida ou continuar trabalhando por obrigação muito além do que desejaria.${notaProfLF}\n\nO que dói mais não é a realidade dos números — é saber que isso ainda pode ser mudado, mas que cada mês de atraso torna a mudança mais difícil e mais cara. O tempo nos investimentos é insubstituível. Quem começa a agir hoje, mesmo com pequenos ajustes, tem uma vantagem enorme sobre quem decide esperar o "momento certo" — que raramente chega sozinho.\n\nVocê ainda tem tempo de reescrever esse cenário. Mas essa decisão precisa ser tomada agora — não amanhã, não no próximo mês. Agora.`;
      }
      if (pctIF <= 50) {
        return `${lfOpener}Pense nos projetos de ${familiaLF}: ${sonhosFamilia} Todos esses projetos têm um preço — e esse preço precisa estar no plano.${notaProfLF}\n\nA boa notícia é que você está em um momento em que ainda é possível mudar de forma significativa. Mas a janela vai se fechando. Cada ano que passa sem uma estratégia clara aumenta o esforço necessário para chegar ao mesmo resultado — e reduz as opções disponíveis.\n\nUma estratégia bem estruturada pode acelerar essa jornada de forma surpreendente. Pequenos ajustes no valor investido, na rentabilidade da carteira ou na forma como o patrimônio está alocado podem fazer uma diferença enorme em 10 ou 15 anos. O caminho existe — o que falta é traçar o plano e começar a seguir.`;
      }
      if (pctIF <= 90) {
        const aposentRef = casado
          ? `uma aposentadoria com liberdade total para você e ${conjugeRef} — para viajar, para estar presentes${temFilhos ? `, para apoiar ${nFilhosStr} nos projetos deles` : ""} —`
          : temFilhos
            ? `uma aposentadoria com liberdade total — para viajar, para estar presente${filhos.length === 1 ? ` para ${nFilhosStr}` : ` para ${nFilhosStr}`}, para apoiar os projetos deles —`
            : "uma aposentadoria com liberdade total — para viajar, para trabalhar por vontade e não por obrigação —";
        return `${lfOpener}${notaProfLF ? notaProfLF.trimStart() + "\n\n" : ""}Mas "quase lá" sem a estratégia certa pode custar caro. São os últimos percentuais que mais exigem atenção: uma carteira mal diversificada, uma rentabilidade abaixo do potencial por alguns anos, ou uma decisão errada em um momento de volatilidade — e o que levou anos para construir pode demorar muito mais para recuperar.\n\nPense no que esse resultado representa: a diferença entre ${aposentRef} e uma aposentadoria com restrições que você não planejou. Esse intervalo entre ${pctIF}% e 100% é exatamente o que separa esses dois cenários.`;
      }
      const liberdadeRef = casado
        ? `para você e ${conjugeRef} acordarem de manhã e escolherem como usar o tempo — não por obrigação, mas por vontade`
        : `para acordar de manhã e escolher como usar o seu tempo — não por obrigação, mas por vontade`;
      const filhosLiberdade = temFilhos
        ? ` Significa poder estar presente nos momentos que importam${filhos.length === 1 ? ` para ${nFilhosStr}` : ` para ${nFilhosStr}`}, apoiar os projetos ${filhos.length === 1 ? "dele" : "deles"}, sem a pressão financeira que acompanha a maioria das famílias.`
        : "";
      return `${lfOpener}Isso significa liberdade de verdade: ${liberdadeRef}.${filhosLiberdade}${notaProfLF}\n\nMas construir é só metade do trabalho. Quem chegou tão longe tem muito a proteger — e esse é exatamente o momento em que os riscos mudam de natureza. Decisões erradas, falta de proteção adequada, carteira mal posicionada para o próximo ciclo econômico: esses são os desafios reais de quem já construiu.\n\nUma estratégia completa garante não apenas que você chegue lá, mas que se mantenha lá — com eficiência, proteção e a tranquilidade de saber que o futuro${casado || temFilhos ? ` de ${familiaLF}` : ""} está resguardado, independente do que aconteça.`;
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
