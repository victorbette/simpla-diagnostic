import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { formatBRL } from "@/lib/carteira/calculos";
import {
  BASE_NOME,
  BASE_PCT,
  FONTE_ROTULO,
  PCT_MINIMO,
  calcularGeometria,
  layoutRotulos,
  limparCacheMedidas,
  type Fatia,
  type RotuloPizza,
} from "@/lib/carteira/labelsPizza";

const PADDING_ANGLE = 1.5;
const ALTURA_PADRAO = 240;
const SEM_MARGEM = { top: 0, right: 0, bottom: 0, left: 0 };

/** Cotovelo + nome + porcentagem de um rótulo já posicionado. */
function renderRotulo(pos: RotuloPizza) {
  const traco =
    `M${pos.x1.toFixed(2)},${pos.y1.toFixed(2)}` +
    ` L${pos.ex.toFixed(2)},${pos.y.toFixed(2)}` +
    ` L${pos.tx.toFixed(2)},${pos.y.toFixed(2)}`;
  return (
    <g key={pos.index}>
      <path d={traco} fill="none" stroke={pos.cor} strokeWidth={1} opacity={0.6} />
      <text
        x={pos.lx}
        y={pos.y + BASE_NOME}
        textAnchor={pos.anchor}
        fontSize={FONTE_ROTULO}
        fill="#374151"
        fontWeight={500}
      >
        {pos.nome}
      </text>
      <text
        x={pos.lx}
        y={pos.y + BASE_PCT}
        textAnchor={pos.anchor}
        fontSize={FONTE_ROTULO}
        fill={pos.cor}
        fontWeight={700}
      >
        {(pos.pct * 100).toFixed(1)}%
      </text>
    </g>
  );
}

export interface PizzaAlocacaoProps {
  dados: Fatia[];
  /** Largura fixa (impressão). Omitida → mede o container e acompanha (tela). */
  largura?: number;
  altura?: number;
  /** Mostra Tooltip. Só faz sentido na tela. */
  interativo?: boolean;
  /** Conteúdo exibido quando não há fatias. */
  vazio?: ReactNode;
}

/**
 * Pizza de alocação com rótulos externos — mesma implementação na tela e no PDF.
 *
 * A animação de entrada fica sempre desligada de propósito: o recharts não
 * desenha rótulo nenhum enquanto a transição roda (`Pie.renderLabels` devolve
 * `null`), o que apagaria os labels numa captura de impressão.
 */
export function PizzaAlocacao({
  dados,
  largura,
  altura = ALTURA_PADRAO,
  interativo = false,
  vazio = null,
}: PizzaAlocacaoProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [medida, setMedida] = useState(0);
  const [, refazerLayout] = useState(0);

  // useLayoutEffect: mede antes do paint, para não existir um frame com a
  // geometria calculada sobre a largura errada.
  useLayoutEffect(() => {
    if (largura !== undefined) return;
    const el = wrapRef.current;
    if (!el) return;
    setMedida(Math.floor(el.getBoundingClientRect().width));
    // Nunca aceitar 0: dentro do medidor oculto do PaginaDocFluida o elemento
    // some durante a impressão e o observer dispararia com largura zerada.
    const ro = new ResizeObserver(([e]) => {
      const w = Math.floor(e.contentRect.width);
      if (w > 0) setMedida(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [largura]);

  // A truncagem depende da métrica da Poppins; se ela ainda não carregou, o
  // canvas mede pela fonte de fallback. Refaz o layout quando a webfont chega.
  useEffect(() => {
    let vivo = true;
    document.fonts?.ready.then(() => {
      if (!vivo) return;
      limparCacheMedidas();
      refazerLayout((v) => v + 1);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const fatias = dados.filter((d) => d.value >= PCT_MINIMO);
  if (fatias.length === 0) return <>{vazio}</>;

  const w = largura ?? medida;
  const geo = calcularGeometria(w, altura);
  // O mesmo array alimenta o <Pie> e o layout: se os dois divergissem, o `index`
  // que o recharts passa apontaria para o rótulo errado.
  const rotulos = w > 0 ? layoutRotulos(fatias, geo, altura, PADDING_ANGLE) : [];
  const total = fatias.reduce((soma, f) => soma + f.value, 0);

  return (
    // `minWidth: 0` é essencial: o <PieChart> renderiza um wrapper com largura
    // fixa em px, que viraria o min-content do container. Numa coluna de grid ou
    // flex isso trava a largura no maior valor já medido — ao encolher a janela,
    // o container não consegue diminuir e o gráfico transborda o card.
    <div ref={wrapRef} className="pizza-alocacao" style={{ height: altura, width: "100%", minWidth: 0 }}>
      {w > 0 && (
        <PieChart width={w} height={altura} margin={SEM_MARGEM}>
          <Pie
            data={fatias}
            cx={geo.cx}
            cy={geo.cy}
            outerRadius={geo.outerRadius}
            innerRadius={0}
            paddingAngle={PADDING_ANGLE}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
            labelLine={false}
            label={(props: { index: number }) => {
              const pos = rotulos[props.index];
              return pos ? renderRotulo(pos) : null;
            }}
            stroke="white"
            strokeWidth={1}
          >
            {fatias.map((fatia, i) => (
              <Cell key={i} fill={fatia.cor} />
            ))}
          </Pie>
          {interativo && (
            <Tooltip
              formatter={(v: number, name: string) => [
                `${total > 0 ? ((v / total) * 100).toFixed(1) : "0.0"}%  ·  ${formatBRL(
                  fatias.find((d) => d.name === name)?.brl ?? 0,
                )}`,
                name,
              ]}
              contentStyle={{ fontSize: 11, borderRadius: 6, border: "0.5px solid #E5E7EB" }}
            />
          )}
        </PieChart>
      )}
    </div>
  );
}
