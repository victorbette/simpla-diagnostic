import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { simularDeclaracaoIRPF } from "@/lib/simularDeclaracao";
import type { DeclaracaoResult } from "@/lib/simularDeclaracao";
import { DOC, TEXTO_CORPO, CARD, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";
import { CalloutConsultor } from "./CalloutConsultor";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

const fmtInteiro = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function MetricaBloco({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div style={{ background: "#FBFCFE", border: `0.5px solid ${DOC.linha}`, borderRadius: 7, padding: "7px 11px", marginBottom: 6 }}>
      <p style={{ fontSize: 8.5, fontWeight: 700, color: DOC.hint, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>
        {label}
      </p>
      <p style={{ fontSize: 13, fontWeight: 700, color: cor ?? DOC.ink, margin: 0 }}>{valor}</p>
    </div>
  );
}

function CardCenario({
  titulo,
  cor,
  bg,
  borda,
  blocos,
  resultadoFinal,
}: {
  titulo: string;
  cor: string;
  bg: string;
  borda: string;
  blocos: { label: string; valor: string; cor?: string }[];
  resultadoFinal: number;
}) {
  const aPagar = resultadoFinal >= 0;
  return (
    <div className="doc-card" style={{ background: bg, border: `1px solid ${borda}`, borderRadius: 10, padding: "12px 14px" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: cor, margin: "0 0 9px" }}>{titulo}</p>
      {blocos.map((b) => (
        <MetricaBloco key={b.label} {...b} />
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", border: `0.5px solid ${DOC.linha}`, borderRadius: 7, padding: "8px 11px", marginTop: 2 }}>
        <span style={{ fontSize: 10.5, color: DOC.muted }}>Resultado Final</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: aPagar ? DOC.vermelho : DOC.verde }}>
          {aPagar ? "A pagar" : "A restituir"}: {formatCurrency(Math.abs(resultadoFinal))}
        </span>
      </div>
    </div>
  );
}

/** Página "Planejamento Tributário" — cenários Sem/Com PGBL + comparativo de IR (v4 p.15) */
export function DocPlanejamentoTributario({ nomeCliente, plan, resultados }: Props) {
  const rf = resultados.fiscal;

  // Recalcula o cenário completo a partir dos inputs salvos pela calculadora
  const temInputs = rf?.inputRendaAnualBruta !== undefined && rf.inputRendaAnualBruta > 0;
  const sim: DeclaracaoResult | null = temInputs
    ? simularDeclaracaoIRPF({
        rendaBruta: rf!.inputRendaAnualBruta!,
        irrf: rf!.inputIrrf ?? 0,
        despesas: rf!.inputDespesas ?? 0,
        dependentes: rf!.inputDependentes ?? 0,
        inss: rf!.inputInssAnual ?? 0,
        aporteAnual: (rf!.inputAporteMensalPGBL ?? 0) > 0 ? rf!.inputAporteMensalPGBL! * 12 : undefined,
      })
    : null;

  const irSem = rf?.irSemPGBL ?? sim?.irSemPGBL ?? 0;
  const irCom = rf?.irComPGBL ?? sim?.irComPGBL ?? 0;
  const economia = rf?.economiaAnual ?? sim?.economia ?? 0;
  const maxBarra = Math.max(irSem, irCom, economia, 1);

  const barras = [
    { label: "IR sem PGBL", valor: irSem, cor: DOC.vermelho },
    { label: "IR com PGBL", valor: irCom, cor: DOC.blue },
    { label: "Economia", valor: economia, cor: DOC.verde },
  ];

  return (
    <PaginaDoc rodape={<RodapePagina nomeCliente={nomeCliente} />}>
      <HeaderSecao titulo="Planejamento Tributário" />

      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
        A eficiência tributária é um dos mecanismos mais poderosos e frequentemente subestimados
        para acelerar a acumulação de riqueza. A importância do Planejamento Tributário reside no
        fato de que o imposto é uma das maiores fricções na rentabilidade de longo prazo.
      </p>

      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 16 }}>
        O nosso trabalho busca, de forma estritamente legal e estruturada, minimizar o impacto dos
        impostos sobre a sua renda e os seus investimentos, transformando o que seria uma "despesa
        fiscal" em capital produtivo a seu favor.
      </p>

      {rf ? (
        <>
          {/* Resultado — cenários lado a lado */}
          {sim && (
            <>
              <p style={LABEL_SUBSECAO(DOC.ink)}>Resultado</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                <CardCenario
                  titulo="↗ Sem PGBL"
                  cor={DOC.vermelho}
                  bg="#FEF6F6"
                  borda="#FECACA"
                  blocos={[
                    { label: "Base de Cálculo", valor: formatCurrency(sim.baseSemPGBL) },
                    { label: "Imposto Devido", valor: formatCurrency(sim.irSemPGBL), cor: DOC.vermelho },
                    { label: "Alíquota Efetiva", valor: `${sim.aliqEfetivaSem.toFixed(2).replace(".", ",")}%` },
                  ]}
                  resultadoFinal={sim.resultadoSem}
                />
                <CardCenario
                  titulo="↘ Com PGBL"
                  cor={DOC.verde}
                  bg="#F4FBF6"
                  borda="#BBF7D0"
                  blocos={[
                    { label: "Nova Base", valor: formatCurrency(sim.baseComPGBL) },
                    { label: "Novo Imposto", valor: formatCurrency(sim.irComPGBL), cor: DOC.verde },
                    { label: "Nova Alíquota Efetiva", valor: `${sim.aliqEfetivaCom.toFixed(2).replace(".", ",")}%` },
                  ]}
                  resultadoFinal={sim.resultadoCom}
                />
              </div>
            </>
          )}

          {/* Comparativo de IR */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <i className="ti ti-chart-bar" style={{ fontSize: 13, color: DOC.blue }} aria-hidden="true" />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: DOC.ink }}>Comparativo de IR</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "IR sem PGBL", valor: irSem, cor: DOC.vermelho, bg: DOC.vermelhoBg },
              { label: "IR com PGBL", valor: irCom, cor: DOC.blue, bg: "#DBEAFE" },
              { label: "Economia", valor: economia, cor: DOC.verde, bg: DOC.verdeBg },
            ].map(({ label, valor, cor, bg }) => (
              <div key={label} className="doc-card" style={{ background: bg, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                <p style={{ fontSize: 8.5, fontWeight: 700, color: cor, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>
                  {label}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: cor, margin: 0 }}>{fmtInteiro.format(valor)}</p>
              </div>
            ))}
          </div>

          {/* Gráfico de barras simples (divs — impressão confiável) */}
          <div className="doc-card" style={{ ...CARD, padding: "16px 20px 10px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: 150, borderBottom: `1px solid ${DOC.linha}` }}>
              {barras.map(({ label, valor, cor }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", width: 110 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: DOC.texto, marginBottom: 4 }}>
                    {fmtInteiro.format(valor)}
                  </span>
                  <div
                    style={{
                      width: 72,
                      height: `${Math.max(2, (valor / maxBarra) * 115)}px`,
                      background: cor,
                      borderRadius: "3px 3px 0 0",
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 6 }}>
              {barras.map(({ label }) => (
                <span key={label} style={{ fontSize: 9.5, color: DOC.muted, width: 110, textAlign: "center" }}>{label}</span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div
          style={{
            ...CARD,
            background: DOC.blueSoft,
            border: `1px solid ${DOC.blueBorder}`,
          }}
        >
          <p style={{ ...TEXTO_CORPO, fontStyle: "italic", color: DOC.muted }}>
            Execute a calculadora tributária na Etapa 2 para ver a simulação de diferimento fiscal
            via PGBL.
          </p>
        </div>
      )}

      <CalloutConsultor clientId={plan.clientId} secao="fiscal" />
    </PaginaDoc>
  );
}
