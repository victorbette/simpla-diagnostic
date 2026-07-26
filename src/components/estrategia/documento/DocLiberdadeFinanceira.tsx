import { useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import { calcularIF } from "@/types/financialPlanning";
import { calcularProjecaoIF, TAXA_ACUM_ANUAL, type PontoProjecao } from "@/lib/financialFreedomCalc";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { DOC, TEXTO_CORPO, CARD, LABEL_CARD, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import { PaginaDocFluida, type BlocoDoc } from "./PaginaDocFluida";
import { blocosNotaConsultor, useNotaConsultor } from "./CalloutConsultor";
import { GraficoIF } from "@/components/shared/GraficoIF";
import type { ObjetivoVida } from "@/types/objetivos";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

function parseDateNasc(s: string): { ano: number; mes: number } | null {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { ano: Number(iso[1]), mes: Number(iso[2]) };
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return { ano: Number(br[3]), mes: Number(br[2]) };
  return null;
}

const fmtInteiro = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

// ── SVG estático para impressão ───────────────────────────────
// Usado apenas no PDF via classe doc-print-only. Na tela o GraficoIF
// (Recharts) é exibido normalmente via doc-screen-only.
// Razão: ResponsiveContainer inicia com width=0 e usa ResizeObserver
// assíncrono; o navegador tira o snapshot do PDF antes de o React
// flushar o setState → gráfico some no PDF.
type DadoGrafico = { idade: number; patrimonio: number };

function GraficoLFImpressao({
  dados,
  patrimonioNecessario,
  objetivos,
  idxIF,
}: {
  dados: DadoGrafico[];
  patrimonioNecessario: number;
  objetivos: ObjetivoVida[];
  idxIF?: number;
}) {
  if (dados.length < 2) return null;

  const W = 620;
  const H = 240;
  const PAD = { top: 20, right: 20, bottom: 30, left: 70 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal =
    Math.max(...dados.map((d) => d.patrimonio), patrimonioNecessario || 0) * 1.1;
  if (maxVal <= 0) return null;

  const scaleX = (idx: number) => PAD.left + (idx / (dados.length - 1)) * innerW;
  const scaleY = (val: number) => PAD.top + innerH - (val / maxVal) * innerH;

  const pathLinha = dados
    .map((d, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(1)} ${scaleY(d.patrimonio).toFixed(1)}`)
    .join(" ");

  const pathArea =
    pathLinha +
    ` L ${scaleX(dados.length - 1).toFixed(1)} ${(PAD.top + innerH).toFixed(1)}` +
    ` L ${PAD.left.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`;

  const yMeta = scaleY(patrimonioNecessario);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    val: maxVal * f,
    y: scaleY(maxVal * f),
  }));

  const xTicks = dados
    .map((d, i) => ({ idade: d.idade, x: scaleX(i), i }))
    .filter(({ i, idade }) => i === 0 || i === dados.length - 1 || Math.round(idade) % 5 === 0);

  const formatBRL = (v: number) => {
    if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
    return `R$${v.toFixed(0)}`;
  };

  const anoAtual = new Date().getFullYear();
  const idxEmoji = idxIF !== undefined ? Math.min(idxIF, dados.length - 1) : dados.length - 1;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", overflow: "visible" }}
    >
      {yTicks.map((t, i) => (
        <line key={i} x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="#F3F4F6" strokeWidth={1} />
      ))}
      <path d={pathArea} fill="#BFDBFE" opacity={0.6} />
      <path d={pathLinha} fill="none" stroke="#2563EB" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {patrimonioNecessario > 0 && yMeta >= PAD.top && yMeta <= PAD.top + innerH && (
        <line x1={PAD.left} y1={yMeta} x2={W - PAD.right} y2={yMeta} stroke="#1E3A8A" strokeWidth={1.5} strokeDasharray="6 3" />
      )}
      <text x={scaleX(idxEmoji)} y={scaleY(dados[idxEmoji].patrimonio) - 12} textAnchor="middle" fontSize={16}>
        🏖
      </text>
      {objetivos.map((obj, i) => {
        const idx = Math.min(Math.max(0, Number(obj.ano) - anoAtual), dados.length - 1);
        if (idx <= 0 || idx >= dados.length - 1) return null;
        const emoji =
          obj.tipo === "casa" ? "🏠" :
          obj.tipo === "viagem" ? "✈️" :
          obj.tipo === "educacao" ? "🎓" :
          obj.tipo === "veiculo" ? "🚗" : "⭐";
        return (
          <text key={i} x={scaleX(idx)} y={scaleY(dados[idx].patrimonio) - 14} textAnchor="middle" fontSize={14}>
            {emoji}
          </text>
        );
      })}
      {yTicks.filter((t) => t.val > 0).map((t, i) => (
        <text key={i} x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize={9} fill="#9CA3AF">
          {formatBRL(t.val)}
        </text>
      ))}
      {xTicks.map((t, i) => (
        <text key={i} x={t.x} y={H - 6} textAnchor="middle" fontSize={9} fill="#9CA3AF">
          {Math.round(t.idade)}a
        </text>
      ))}
    </svg>
  );
}

export function DocLiberdadeFinanceira({ nomeCliente, plan, resultados }: Props) {
  const pi = plan.planejamentoIF;
  const rif = resultados.if;

  const nota = useNotaConsultor(plan.clientId, "lf");

  const projecaoData = useMemo((): { projecao: PontoProjecao[]; mesIF?: number } => {
    if (rif?.projecao && rif.projecao.length > 0) {
      return { projecao: rif.projecao, mesIF: rif.mesInicioRetirada };
    }
    if (!pi.rendaMensalDesejada || !pi.idadeMeta) return { projecao: [] };

    const parsed = parseDateNasc(plan.dadosCliente.dataNascimento);
    const anoNasc = parsed?.ano ?? (new Date().getFullYear() - (pi.idadeAtual || 35));
    const mesNasc = parsed?.mes ?? 1;
    const idadeAtual = parsed
      ? Math.floor((Date.now() - new Date(parsed.ano, parsed.mes - 1).getTime()) / (365.25 * 24 * 3600 * 1000))
      : (pi.idadeAtual || 35);

    if (pi.idadeMeta <= idadeAtual) return { projecao: [] };

    try {
      const result = calcularProjecaoIF({
        idadeAtual,
        idadeMeta: pi.idadeMeta,
        idadeMaxima: 90,
        patrimonioInicial: pi.patrimonioAtual,
        aporteMensal: pi.aporteMensal,
        rendaMensalDesejada: pi.rendaMensalDesejada,
        taxaRetornoAnual: TAXA_ACUM_ANUAL,
        anoNascimento: anoNasc,
        mesNascimento: mesNasc,
        objetivos: [],
      });
      return { projecao: result.projecao, mesIF: result.mesInicioRetirada };
    } catch {
      return { projecao: [] };
    }
  }, [rif, pi, plan.dadosCliente.dataNascimento]);

  // Amostras anuais para o SVG de impressão
  const dadosGrafico = useMemo<DadoGrafico[]>(
    () =>
      projecaoData.projecao
        .filter((_, i) => i % 12 === 0 || i === projecaoData.projecao.length - 1)
        .map((p) => ({ idade: p.idade, patrimonio: p.patrimonio })),
    [projecaoData.projecao]
  );

  const idxIF =
    projecaoData.mesIF !== undefined
      ? Math.min(Math.floor(projecaoData.mesIF / 12), dadosGrafico.length - 1)
      : undefined;

  const rendaDesejada = rif?.rendaMensalDesejada ?? pi.rendaMensalDesejada;
  const patrimonioNecessario = rendaDesejada > 0 ? (rendaDesejada * 12) / 0.04 : 0;
  const simplesIF = !rif && !projecaoData.projecao.length && pi.rendaMensalDesejada > 0
    ? calcularIF(pi) : null;
  const patrimonioNaIF = rif?.patrimonioAposentadoria
    ?? (projecaoData.mesIF !== undefined && projecaoData.mesIF < projecaoData.projecao.length
        ? (projecaoData.projecao[projecaoData.mesIF]?.patrimonio ?? 0)
        : (simplesIF?.patrimonioProjetado ?? 0));
  const rendaSustentavel = (patrimonioNaIF * 0.04) / 12;
  const aporteNecessario = rif?.aporteAjustado ?? rif?.aporteAtual ?? pi.aporteMensal;
  const aporteAtual = rif?.aporteAtual ?? pi.aporteMensal;
  const objetivos = rif?.objetivos ?? [];
  const temDados = patrimonioNecessario > 0 || projecaoData.projecao.length > 0;

  const metaAtingida = rendaDesejada > 0 && rendaSustentavel >= rendaDesejada;
  const aporteOk = aporteNecessario <= aporteAtual;

  const containerGrafico = {
    background: "#FBFCFE",
    border: `1px solid ${DOC.linha}`,
    borderRadius: 10,
    padding: "10px 8px 4px",
    overflow: "visible" as const,
    height: 280,
    minHeight: 280,
  };

  const blocos: BlocoDoc[] = [
    {
      chave: "intro-1",
      node: (
        <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
          A estruturação da sua Liberdade Financeira é o pilar central do nosso planejamento. A
          importância desta etapa reside em transformar as suas expectativas de futuro em um mapa
          matemático claro e executável. Sem um destino financeiro definido e um diagnóstico preciso
          do seu custo de vida, a acumulação de capital perde eficiência. Nosso objetivo é garantir a
          gestão estratégica dos seus recursos hoje, estabelecendo metas reais para que você atinja a
          independência financeira com previsibilidade, segurança e controle absoluto sobre o seu
          tempo.
        </p>
      ),
    },
    {
      chave: "intro-2",
      node: (
        <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 16 }}>
          Com base no seu cenário atual, elaboramos uma projeção estratégica detalhada para
          viabilizar a sua transição para a liberdade financeira na idade alvo estipulada, garantindo
          uma renda mensal sustentável e protegida da perda de poder de compra:
        </p>
      ),
    },
    {
      chave: "metricas",
      node: temDados ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div className="doc-card" style={{ ...CARD, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Patrimônio Necessário</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: DOC.blue, margin: 0 }}>
              {formatCurrency(patrimonioNecessario)}
            </p>
            <p style={{ fontSize: 9.5, color: DOC.hint, margin: "3px 0 0" }}>
              perpetuidade (regra dos 4%)
            </p>
          </div>

          <div className="doc-card" style={{ ...CARD, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Projeção Atual</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: metaAtingida ? DOC.verde : DOC.vermelho, margin: 0 }}>
              {formatCurrency(patrimonioNaIF)}
            </p>
            <p style={{ fontSize: 9.5, color: DOC.hint, margin: "3px 0 0" }}>na aposentadoria</p>
          </div>

          <div className="doc-card" style={{ ...CARD, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Aporte Necessário</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: aporteOk ? DOC.verde : DOC.vermelho, margin: 0 }}>
              {aporteNecessario > 0 ? `${fmtInteiro.format(aporteNecessario)}/mês` : "Meta atingível"}
            </p>
            <p style={{ fontSize: 9.5, color: aporteOk ? DOC.verde : DOC.hint, margin: "3px 0 0" }}>
              {aporteOk
                ? "Aporte atual suficiente"
                : `Faltam ${fmtInteiro.format(aporteNecessario - aporteAtual)}/mês`}
              {objetivos.length > 0 && ` · inclui ${objetivos.length} objetivo(s) de vida`}
            </p>
          </div>

          <div className="doc-card" style={{ ...CARD, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Renda Sustentável</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: metaAtingida ? DOC.verde : DOC.ink, margin: 0 }}>
              {rendaSustentavel > 0 ? fmtInteiro.format(rendaSustentavel) : "—"}
            </p>
            <p style={{ fontSize: 9.5, color: DOC.hint, margin: "3px 0 0" }}>
              /mês com a projeção atual
            </p>
            {rendaDesejada > 0 && rendaSustentavel > 0 && (
              <p style={{ fontSize: 9.5, fontWeight: 600, color: metaAtingida ? DOC.verde : DOC.vermelho, margin: "3px 0 0" }}>
                {metaAtingida
                  ? `✓ Meta de ${fmtInteiro.format(rendaDesejada)}/mês atingida`
                  : `Meta: ${fmtInteiro.format(rendaDesejada)}/mês`}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div style={{ ...CARD, background: DOC.blueSoft, border: `1px solid ${DOC.blueBorder}`, marginBottom: 18 }}>
          <p style={{ ...TEXTO_CORPO, fontStyle: "italic", color: DOC.muted }}>
            Execute a simulação de Liberdade Financeira para ver as projeções detalhadas.
          </p>
        </div>
      ),
    },
    {
      chave: "grafico",
      node: projecaoData.projecao.length > 0 ? (
        <div style={{ marginBottom: 4 }}>
          {/* Tela: GraficoIF (Recharts) — ResponsiveContainer funciona normalmente */}
          <div className="doc-screen-only doc-card grafico-doc-lf" style={containerGrafico}>
            <GraficoIF
              projecao={projecaoData.projecao}
              patrimonioNecessario={patrimonioNecessario}
              mesIF={projecaoData.mesIF}
              objetivos={objetivos}
              height={260}
              interativo={false}
            />
          </div>
          {/* Impressão: SVG puro — sem ResizeObserver, sempre correto no PDF */}
          <div className="doc-print-only doc-card grafico-doc-lf" style={containerGrafico}>
            {dadosGrafico.length > 1 && (
              <GraficoLFImpressao
                dados={dadosGrafico}
                patrimonioNecessario={patrimonioNecessario}
                objetivos={objetivos}
                idxIF={idxIF}
              />
            )}
          </div>
        </div>
      ) : (
        <div style={{ ...CARD, background: DOC.blueSoft, border: `1px solid ${DOC.blueBorder}`, textAlign: "center", padding: "26px 20px" }}>
          <p style={{ ...TEXTO_CORPO, color: DOC.muted }}>
            Execute o simulador de Liberdade Financeira para ver o gráfico de projeção.
          </p>
        </div>
      ),
    },
  ];

  if (objetivos.length > 0) {
    blocos.push({
      chave: "objetivos",
      node: (
        <div style={{ marginTop: 14 }}>
          <p style={LABEL_SUBSECAO()}>Objetivos de Vida</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {objetivos.slice(0, 5).map((obj) => (
              <div
                key={obj.id}
                className="doc-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 14px",
                  background: "white",
                  borderRadius: 7,
                  border: `1px solid ${DOC.linha}`,
                }}
              >
                <span style={{ flex: 1, fontSize: 12, color: DOC.ink, fontWeight: 500 }}>{obj.label}</span>
                <span style={{ fontSize: 11, color: DOC.muted }}>{String(obj.mes).padStart(2, "0")}/{obj.ano}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: DOC.blue }}>{formatCurrency(obj.valorBRL)}</span>
              </div>
            ))}
            {objetivos.length > 5 && (
              <p style={{ margin: "2px 0 0", fontSize: 10.5, color: DOC.hint }}>
                + {objetivos.length - 5} outros objetivos considerados na projeção
              </p>
            )}
          </div>
        </div>
      ),
    });
  }

  blocos.push(...blocosNotaConsultor(plan.clientId, "lf", nota));

  return <PaginaDocFluida titulo="Liberdade Financeira" nomeCliente={nomeCliente} blocos={blocos} />;
}
