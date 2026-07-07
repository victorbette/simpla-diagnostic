import { PieChart, Pie, Cell } from "recharts";
import { formatCurrency } from "@/lib/format";
import { calcularAlocacaoAtual, ALOCACAO_ALVO, PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan, MacroalocacaoAlvo } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { DOC, TEXTO_CORPO, CARD, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import { PAG, TOTAL_PAGINAS } from "@/lib/documentoPaginas";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";
import { CalloutConsultor } from "./CalloutConsultor";

const CLASSE_LABELS: Record<string, string> = {
  rendaFixa: "Renda Fixa",
  acoes: "Ações",
  fiis: "FIIs",
  rvGlobal: "RV Global",
  rfGlobal: "RF Global",
  cripto: "Cripto",
};

const CLASSE_COLORS: Record<string, string> = {
  rendaFixa: "#1E3A8A",
  acoes: "#2563EB",
  fiis: "#60A5FA",
  rvGlobal: "#7C3AED",
  rfGlobal: "#0891B2",
  cripto: "#B45309",
};

const CHAVES = ["rendaFixa", "acoes", "fiis", "rvGlobal", "rfGlobal", "cripto"] as const;

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

function fmtPct(v: number) {
  return `${v.toFixed(1).replace(".", ",")}%`;
}

/** Donut fixo (sem ResponsiveContainer — impressão confiável) */
function Donut({
  titulo,
  totalLabel,
  aloc,
  patrimonio,
}: {
  titulo: string;
  totalLabel: string;
  aloc: MacroalocacaoAlvo;
  patrimonio: number;
}) {
  const dados = CHAVES.filter((k) => (aloc[k] ?? 0) > 0.05).map((k) => ({
    name: CLASSE_LABELS[k],
    value: aloc[k],
    cor: CLASSE_COLORS[k],
    chave: k,
  }));

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: DOC.ink, textAlign: "center" }}>
        {titulo}
      </p>
      <p style={{ margin: 0, fontSize: 10.5, color: DOC.muted, textAlign: "center" }}>{totalLabel}</p>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <PieChart width={170} height={150}>
          <Pie
            data={dados}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={64}
            paddingAngle={2}
            isAnimationActive={false}
            stroke="white"
            strokeWidth={1.5}
          >
            {dados.map((d) => (
              <Cell key={d.chave} fill={d.cor} />
            ))}
          </Pie>
        </PieChart>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {dados.map((d) => (
          <div key={d.chave} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.cor, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 10.5, color: DOC.texto }}>{d.name}</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: DOC.ink }}>{fmtPct(d.value)}</span>
            <span style={{ fontSize: 10.5, color: DOC.hint, minWidth: 74, textAlign: "right" }}>
              {formatCurrency((patrimonio * d.value) / 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TH: React.CSSProperties = {
  padding: "7px 10px",
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "white",
  textAlign: "right",
  whiteSpace: "nowrap",
};

const TD: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 11.5,
  color: DOC.texto,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

export function DocAssetAllocation({ nomeCliente, plan, resultados }: Props) {
  const perfil = plan.dadosCliente.suitabilityPerfil;
  const perfilLabel = perfil ? PERFIL_LABELS[perfil] : "não definido";
  const alocAtual = calcularAlocacaoAtual(plan.ativosAtuais);
  const alocMeta = perfil ? ALOCACAO_ALVO[perfil] : null;
  const patrimonio = resultados.carteira?.patrimonio ?? plan.ativosAtuais.total;
  const comecandoDoZero = plan.dadosCliente.comecandoDoZero;
  const planoAcao = resultados.carteira?.planoAcao ?? [];

  const linhas = CHAVES.filter(
    (k) => (alocAtual[k] ?? 0) > 0.05 || ((alocMeta?.[k] ?? 0) > 0.05),
  );

  return (
    <PaginaDoc
      rodape={<RodapePagina nomeCliente={nomeCliente} numPagina={PAG.aa} totalPaginas={TOTAL_PAGINAS} />}
    >
      <HeaderSecao titulo="Asset Allocation" />

      <p style={{ ...TEXTO_CORPO, marginBottom: 18 }}>
        Com base no perfil <strong>{perfilLabel}</strong> e patrimônio financeiro de{" "}
        <strong>{formatCurrency(patrimonio)}</strong>, definimos a distribuição recomendada abaixo,
        comparada com a carteira atual.
      </p>

      {comecandoDoZero ? (
        <div
          style={{
            ...CARD,
            background: DOC.verdeBg,
            border: "1px solid #BBF7D0",
            marginBottom: 18,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: DOC.verde, fontSize: 12.5 }}>
            Iniciando a jornada de investimentos — carteira a ser construída conforme o perfil{" "}
            {perfilLabel}.
          </p>
        </div>
      ) : (
        <>
          <p style={LABEL_SUBSECAO()}>Alocação Atual vs Proposta</p>
          <div className="doc-card" style={{ display: "flex", gap: 26, marginBottom: 20 }}>
            <Donut
              titulo="Atual"
              totalLabel={formatCurrency(patrimonio)}
              aloc={alocAtual}
              patrimonio={patrimonio}
            />
            {alocMeta && (
              <Donut
                titulo="Proposta"
                totalLabel={formatCurrency(patrimonio)}
                aloc={alocMeta}
                patrimonio={patrimonio}
              />
            )}
          </div>
        </>
      )}

      {/* Tabela comparativa */}
      {alocMeta && !comecandoDoZero && (
        <table
          className="doc-card"
          style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18, borderRadius: 8, overflow: "hidden" }}
        >
          <thead>
            <tr style={{ background: DOC.navy }}>
              <th style={{ ...TH, textAlign: "left" }}>Classe</th>
              <th style={TH}>% Atual</th>
              <th style={TH}>R$ Atual</th>
              <th style={TH}>% Meta</th>
              <th style={TH}>R$ Meta</th>
              <th style={TH}>Dif R$</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((k, i) => {
              const pctAtual = alocAtual[k] ?? 0;
              const pctMeta = alocMeta[k] ?? 0;
              const vAtual = (patrimonio * pctAtual) / 100;
              const vMeta = (patrimonio * pctMeta) / 100;
              const dif = vMeta - vAtual;
              return (
                <tr key={k} style={{ background: i % 2 === 0 ? "white" : "#F6F9FE" }}>
                  <td style={{ ...TD, textAlign: "left" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: CLASSE_COLORS[k],
                        marginRight: 7,
                      }}
                    />
                    {CLASSE_LABELS[k]}
                  </td>
                  <td style={TD}>{fmtPct(pctAtual)}</td>
                  <td style={TD}>{formatCurrency(vAtual)}</td>
                  <td style={{ ...TD, fontWeight: 600 }}>{fmtPct(pctMeta)}</td>
                  <td style={{ ...TD, fontWeight: 600 }}>{formatCurrency(vMeta)}</td>
                  <td
                    style={{
                      ...TD,
                      fontWeight: 700,
                      color: dif > 0.5 ? DOC.verde : dif < -0.5 ? DOC.vermelho : DOC.hint,
                    }}
                  >
                    {dif > 0.5 ? "+" : ""}
                    {formatCurrency(dif)}
                  </td>
                </tr>
              );
            })}
            <tr style={{ borderTop: `2px solid ${DOC.linha}`, background: "white" }}>
              <td style={{ ...TD, textAlign: "left", fontWeight: 700, color: DOC.ink }}>Total</td>
              <td style={{ ...TD, fontWeight: 700 }}>100%</td>
              <td style={{ ...TD, fontWeight: 700 }}>{formatCurrency(patrimonio)}</td>
              <td style={{ ...TD, fontWeight: 700 }}>100%</td>
              <td style={{ ...TD, fontWeight: 700 }}>{formatCurrency(patrimonio)}</td>
              <td style={TD} />
            </tr>
          </tbody>
        </table>
      )}

      {/* Plano de ação da carteira */}
      {planoAcao.length > 0 && (
        <div>
          <p style={LABEL_SUBSECAO()}>Movimentações Recomendadas</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {planoAcao.slice(0, 6).map((item) => {
              const badge =
                item.movimentacaoBRL > 0
                  ? { label: "Aportar", color: DOC.verde, bg: DOC.verdeBg }
                  : item.movimentacaoBRL < 0
                  ? { label: "Resgatar", color: DOC.vermelho, bg: DOC.vermelhoBg }
                  : { label: "Manter", color: DOC.muted, bg: DOC.linhaSoft };
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "5px 12px",
                    background: "white",
                    borderRadius: 6,
                    border: `1px solid ${DOC.linha}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: badge.bg,
                      color: badge.color,
                      flexShrink: 0,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {badge.label}
                  </span>
                  <span style={{ flex: 1, fontSize: 11.5, color: DOC.ink }}>{item.nomeAtivo}</span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: item.movimentacaoBRL > 0 ? DOC.verde : item.movimentacaoBRL < 0 ? DOC.vermelho : DOC.hint,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.movimentacaoBRL === 0 ? "—" : formatCurrency(Math.abs(item.movimentacaoBRL))}
                  </span>
                </div>
              );
            })}
            {planoAcao.length > 6 && (
              <p style={{ margin: "2px 0 0", fontSize: 10.5, color: DOC.hint }}>
                + {planoAcao.length - 6} outras movimentações detalhadas com o consultor
              </p>
            )}
          </div>
        </div>
      )}

      <CalloutConsultor clientId={plan.clientId} secao="aa" />
    </PaginaDoc>
  );
}
