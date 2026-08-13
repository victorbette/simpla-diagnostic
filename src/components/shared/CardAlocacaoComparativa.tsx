import { useLayoutEffect, useRef, useState } from "react";
import { PizzaAlocacao } from "./PizzaAlocacao";
import { montarFatias, type Fatia } from "@/lib/carteira/labelsPizza";

export type { Fatia };

interface Props {
  macroAtual: Record<string, number>;
  macroMeta: Record<string, number>;
  patrimonio: number;
}

const ALTURA = 240;
/**
 * Abaixo desta largura de grid, duas colunas dariam menos de ~280px por gráfico
 * — largura em que a pizza já bate no piso do raio e os nomes viram reticências.
 * Empilhar devolve a largura inteira a cada gráfico.
 * O documento A4 tem ~625px de grid, então o PDF continua em duas colunas.
 */
const LIMITE_COLUNA_UNICA = 576;

function GraficoPizza({ titulo, dados }: { titulo: string; dados: Fatia[] }) {
  return (
    // minWidth: 0 permite que a coluna do grid encolha abaixo do conteúdo
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#6B7280",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          textAlign: "center",
          marginBottom: 4,
        }}
      >
        {titulo}
      </div>
      <PizzaAlocacao
        dados={dados}
        altura={ALTURA}
        interativo
        vazio={
          <div
            style={{
              height: ALTURA,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "#9CA3AF",
            }}
          >
            Sem dados
          </div>
        }
      />
    </div>
  );
}

export function CardAlocacaoComparativa({ macroAtual, macroMeta, patrimonio }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [larguraGrid, setLarguraGrid] = useState(0);

  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    setLarguraGrid(Math.floor(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([e]) => {
      const w = Math.floor(e.contentRect.width);
      if (w > 0) setLarguraGrid(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const umaColuna = larguraGrid > 0 && larguraGrid < LIMITE_COLUNA_UNICA;

  return (
    <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <i className="ti ti-chart-pie" style={{ fontSize: 18, color: "#2563EB" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Alocação Atual × Proposta</span>
      </div>
      {/* minmax(0, 1fr) em vez de 1fr: o default `min-width: auto` das colunas de
          grid as impede de encolher abaixo do conteúdo, e o wrapper do Recharts
          tem largura fixa em px — sem isto o card transborda ao estreitar a tela. */}
      <div
        ref={gridRef}
        style={{
          display: "grid",
          gridTemplateColumns: umaColuna ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 16,
        }}
      >
        <GraficoPizza titulo="Carteira Atual" dados={montarFatias(macroAtual, patrimonio)} />
        <GraficoPizza titulo="Alocação Proposta" dados={montarFatias(macroMeta, patrimonio)} />
      </div>
    </div>
  );
}
