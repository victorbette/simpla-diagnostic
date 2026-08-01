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

  const temFilhos = Array.isArray(dadosColeta.filhos) && dadosColeta.filhos.length > 0;

  const pilarBlindagem = temFilhos
    ? ", e a proteção que você tem para garantir que sua família esteja segura independente do que aconteça"
    : ", e a blindagem do patrimônio que você está construindo";

  const paragrafoFinal = temFilhos
    ? `Pense nos seus filhos. Pense no futuro que você quer construir para eles — a educação, a segurança, a tranquilidade de saber que, aconteça o que acontecer, eles estarão protegidos. Esse futuro não se constrói sozinho. Ele é resultado de decisões tomadas hoje, com consistência e com acompanhamento.`
    : `Pense no futuro que você quer construir — a liberdade de acordar sem a pressão do trabalho por obrigação, de tomar decisões com base no que deseja, não no que precisa. Esse futuro não se constrói sozinho. Ele é resultado de decisões tomadas hoje, com consistência e com acompanhamento.`;

  const textoEmocional = `${nome}, você está segurando em mãos algo que poucas pessoas têm coragem de buscar: a verdade sobre a própria situação financeira.

A maioria das pessoas vive anos — décadas — sem jamais parar para olhar de frente para os números que vão definir o futuro delas. Evitam essa conversa porque ela exige honestidade. Porque ela revela que o tempo passa, que as decisões têm consequências, e que adiar é uma escolha — com um custo real que ninguém coloca no extrato.

Este diagnóstico analisou três pilares fundamentais da sua vida financeira: a sua jornada rumo à liberdade financeira, a qualidade e a eficiência dos seus investimentos${pilarBlindagem}. Cada um desses pilares tem um impacto direto no tipo de vida que você terá daqui a 10, 20 ou 30 anos.

O resultado que você vê acima não é um julgamento. É uma bússola. Ele mostra onde você está hoje — e mais importante do que isso, revela o caminho para onde você precisa chegar. A pontuação não é o destino: é o ponto de partida.

Mas aqui está o que mais importa: clareza sem ação não transforma nada. O maior erro que alguém pode cometer após um diagnóstico como este é guardar esse documento na gaveta e continuar exatamente como estava. Cada semana sem uma estratégia estruturada é uma semana em que os juros compostos não estão trabalhando para você da forma que poderiam. Cada mês de atraso tem um custo que não aparece em nenhum extrato — mas que se acumula silenciosamente e se torna cada vez mais difícil de recuperar.

${paragrafoFinal}

Os próximos passos estão mapeados neste documento. A jornada começa agora.`;

  const blocos: BlocoDoc[] = [
    {
      chave: "hero",
      grudaNoProximo: true,
      node: (
        <>
          {/* Card score geral */}
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

          {/* Grid 3 gauges */}
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
