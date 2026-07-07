import { BarChart, Bar, XAxis, YAxis, Cell, LabelList } from "recharts";
import { formatCurrency } from "@/lib/format";
import { calcularFiscal } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { DOC, TEXTO_CORPO, CARD, LABEL_CARD, VALOR_CARD, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import { PAG, TOTAL_PAGINAS } from "@/lib/documentoPaginas";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";
import { CalloutConsultor } from "./CalloutConsultor";

const TIPO_DECLARACAO_LABELS: Record<string, string> = {
  completa: "Completa",
  simplificada: "Simplificada",
  nao_sei: "Não definido",
};

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

export function DocPlanejamentoFiscal({ nomeCliente, plan, resultados }: Props) {
  const pf = plan.fiscal;
  const rf = resultados.fiscal;
  const simplesF = !rf ? calcularFiscal(pf) : null;

  const rendaAnual = rf?.rendaAnual ?? pf.rendaBrutaAnual;
  const tetoPGBL = rf?.tetoPGBLAnual ?? simplesF?.tetoPGBL ?? 0;
  const economiaAnual = rf?.economiaAnual ?? simplesF?.economiaEstimadaPGBL ?? 0;
  const espacoMensal = rf?.espacoDisponivelMensal ?? ((simplesF?.espacoPGBL ?? 0) / 12);
  const aproveitandoTeto = rf?.aproveitandoTeto ?? (simplesF?.pgblAtingidoTeto ?? false);
  const tipoDeclaracaoLabel = TIPO_DECLARACAO_LABELS[pf.tipoDeclaracao] ?? "—";

  const aproveitamentoPct = tetoPGBL > 0
    ? Math.min(100, Math.round(((rf?.aporteAnual ?? simplesF?.pgblAtual ?? 0) / tetoPGBL) * 100))
    : 0;
  const pctFinal = aproveitandoTeto ? 100 : aproveitamentoPct;
  const corAproveitamento = pctFinal >= 80 ? DOC.verde : pctFinal >= 50 ? DOC.ambar : DOC.vermelho;

  const dadosIR = rf && rf.irSemPGBL > 0
    ? [
        { nome: "IR sem PGBL", valor: rf.irSemPGBL, cor: DOC.hint },
        { nome: "IR com PGBL", valor: rf.irComPGBL, cor: DOC.navy },
        { nome: "Economia", valor: rf.economiaAnual, cor: DOC.verde },
      ]
    : null;

  return (
    <PaginaDoc
      rodape={<RodapePagina nomeCliente={nomeCliente} numPagina={PAG.fiscal} totalPaginas={TOTAL_PAGINAS} />}
    >
      <HeaderSecao titulo="Planejamento Fiscal" />

      <p style={{ ...TEXTO_CORPO, marginBottom: 18 }}>
        {pf.tipoDeclaracao === "completa" ? (
          <>
            <strong>{nomeCliente.split(" ")[0]}</strong> declara Imposto de Renda no modelo
            completo, o que abre espaço para diferimento fiscal via PGBL. Analisamos abaixo o
            aproveitamento desse benefício.
          </>
        ) : (
          <>
            O planejamento fiscal busca maximizar a eficiência tributária de forma legal, garantindo
            que você pague apenas o imposto devido e aproveite os benefícios disponíveis na
            legislação.
          </>
        )}
      </p>

      {/* Situação fiscal atual */}
      <p style={LABEL_SUBSECAO()}>Situação Fiscal Atual</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div className="doc-card" style={CARD}>
          <p style={LABEL_CARD}>Renda Anual Bruta</p>
          <p style={VALOR_CARD}>{formatCurrency(rendaAnual)}</p>
        </div>
        <div className="doc-card" style={CARD}>
          <p style={LABEL_CARD}>Tipo de Declaração</p>
          <p style={{ ...VALOR_CARD, color: pf.tipoDeclaracao === "nao_sei" ? DOC.ambar : DOC.ink }}>
            {tipoDeclaracaoLabel}
          </p>
        </div>
        <div className="doc-card" style={CARD}>
          <p style={LABEL_CARD}>Teto PGBL (12%)</p>
          <p style={VALOR_CARD}>
            {formatCurrency(tetoPGBL)}
            <span style={{ fontSize: 11, fontWeight: 500, color: DOC.muted }}>/ano</span>
          </p>
        </div>
        <div className="doc-card" style={CARD}>
          <p style={LABEL_CARD}>Aproveitamento do Teto</p>
          <p style={{ ...VALOR_CARD, color: corAproveitamento }}>{pctFinal}%</p>
          <div
            style={{
              height: 6,
              borderRadius: 4,
              background: DOC.linhaSoft,
              overflow: "hidden",
              marginTop: 7,
            }}
          >
            <div
              style={{
                width: `${pctFinal}%`,
                height: "100%",
                background: corAproveitamento,
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      </div>

      {/* Oportunidade de diferimento */}
      {espacoMensal > 0 && pf.tipoDeclaracao === "completa" && (
        <div
          className="doc-card"
          style={{
            background: DOC.blueSoft,
            border: `1px solid ${DOC.blueBorder}`,
            borderRadius: 10,
            padding: "16px 20px",
            marginBottom: 16,
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 700, color: DOC.navy }}>
            Oportunidade de Diferimento Fiscal
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
            <div style={{ background: "white", border: `1px solid ${DOC.blueBorder}`, borderRadius: 8, padding: "10px 14px" }}>
              <p style={LABEL_CARD}>Espaço Disponível</p>
              <p style={{ ...VALOR_CARD, fontSize: 17, color: DOC.blue }}>
                {formatCurrency(espacoMensal)}
                <span style={{ fontSize: 11, fontWeight: 500, color: DOC.muted }}>/mês</span>
              </p>
            </div>
            <div style={{ background: "white", border: `1px solid ${DOC.blueBorder}`, borderRadius: 8, padding: "10px 14px" }}>
              <p style={LABEL_CARD}>Economia Anual</p>
              <p style={{ ...VALOR_CARD, fontSize: 17, color: DOC.verde }}>
                {formatCurrency(economiaAnual)}
              </p>
            </div>
          </div>
          <p style={{ ...TEXTO_CORPO, fontSize: 12, color: DOC.navyInk }}>
            Aumentando o PGBL em <strong>{formatCurrency(espacoMensal)}/mês</strong>, você reduz o
            Imposto de Renda em <strong>{formatCurrency(economiaAnual)}/ano</strong>.
          </p>
        </div>
      )}

      {aproveitandoTeto && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 999,
            background: DOC.verdeBg,
            border: "1px solid #86EFAC",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: DOC.verde }}>
            ✓ PGBL maximizado — aproveitando 100% do benefício fiscal
          </span>
        </div>
      )}

      {/* Comparativo IR */}
      {dadosIR && (
        <div className="doc-card" style={{ ...CARD, padding: "16px 20px 8px", marginBottom: 4 }}>
          <p style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 700, color: DOC.ink }}>
            Imposto de Renda: Sem PGBL vs. Com PGBL
          </p>
          <BarChart
            width={620}
            height={170}
            data={dadosIR}
            layout="vertical"
            margin={{ top: 8, right: 110, bottom: 4, left: 8 }}
            barCategoryGap="28%"
          >
            <XAxis type="number" hide domain={[0, (rf?.irSemPGBL ?? 0) * 1.05]} />
            <YAxis
              type="category"
              dataKey="nome"
              width={96}
              tick={{ fontSize: 11.5, fill: DOC.muted }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="valor" radius={[0, 5, 5, 0]} isAnimationActive={false} barSize={22}>
              {dadosIR.map((d) => (
                <Cell key={d.nome} fill={d.cor} />
              ))}
              <LabelList
                dataKey="valor"
                position="right"
                formatter={(v: number) => formatCurrency(v)}
                style={{ fontSize: 11.5, fontWeight: 700, fill: DOC.ink }}
              />
            </Bar>
          </BarChart>
        </div>
      )}

      {/* Rendimentos isentos */}
      {pf.temRendimentosIsentos && pf.tiposRendimentosIsentos.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p style={LABEL_SUBSECAO()}>Rendimentos Isentos</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {pf.tiposRendimentosIsentos.map((tipo) => (
              <span
                key={tipo}
                style={{
                  fontSize: 11,
                  padding: "3px 11px",
                  borderRadius: 999,
                  background: DOC.verdeBg,
                  color: DOC.verde,
                  fontWeight: 600,
                }}
              >
                ✓ {tipo}
              </span>
            ))}
          </div>
        </div>
      )}

      <CalloutConsultor clientId={plan.clientId} secao="fiscal" />
    </PaginaDoc>
  );
}
