/**
 * Layout dos rótulos externos das pizzas de alocação (Alocação Atual × Proposta).
 *
 * Módulo puro — sem React e sem recharts. É o único lugar que decide onde cada
 * rótulo fica; `PizzaAlocacao` apenas desenha o que sai daqui.
 *
 * O problema resolvido: fatias pequenas e angularmente próximas produziam
 * rótulos sobrepostos e linhas de chamada cruzadas. A correção tem quatro partes:
 *   1. ângulos idênticos aos do recharts, inclusive `paddingAngle`;
 *   2. raios derivados da largura real, para o texto caber dentro do SVG;
 *   3. decolisão vertical por PAVA, usando a altura REAL do rótulo;
 *   4. cotovelo reprojetado na circunferência a partir do Y já ajustado.
 */

import { CARD_ORDER, CARD_META } from "./types";

const RADIAN = Math.PI / 180;

/* ── Geometria ────────────────────────────────────────────────────────────── */

const PAD           = 2;   // respiro entre o texto e a borda do SVG
const TICK          = 14;  // traço horizontal entre o cotovelo e o texto
const MIN_TEXTO     = 46;  // largura de texto garantida no equador (px)
const ELBOW_PAD     = 28;  // folga radial preferida entre a pizza e o cotovelo
const ELBOW_MIN_PAD = 20;  // folga radial mínima aceitável
const R_PREF        = 75;  // raio desejado quando há espaço de sobra
const R_MIN         = 40;  // piso: abaixo disto a pizza deixa de ser legível
/** Fração do raio do cotovelo abaixo da qual ele não encosta no eixo central. */
const MIN_DX_FRAC = 0.3;

/* ── Tipografia do rótulo ─────────────────────────────────────────────────── */

export const FONTE_ROTULO = 9;
/** Baselines das duas linhas, relativas ao centro vertical do rótulo. */
export const BASE_NOME = -5;
export const BASE_PCT = 7;
/**
 * Extensão real do bloco de duas linhas em torno do centro: para cima, a
 * baseline do nome (5) mais o acento mais alto de Poppins 9px (~7); para baixo,
 * a baseline da porcentagem (7) mais uma folga de descida (3).
 * Subestimar isto era a causa principal da sobreposição — a folga usada entre
 * rótulos vizinhos era de 15px para um bloco de 22px.
 */
const ACIMA = 12;
const ABAIXO = 10;
export const ALTURA_ROTULO = ACIMA + ABAIXO;
const FOLGA_MIN = ALTURA_ROTULO + 2;

/** Percentual mínimo para uma fatia entrar no gráfico. */
export const PCT_MINIMO = 0.5;

/* ── Fatias ───────────────────────────────────────────────────────────────── */

export interface Fatia {
  name: string;
  value: number;
  cor: string;
  brl: number;
}

/** Monta as fatias na ordem canônica de `CARD_ORDER`, já sem as irrelevantes. */
export function montarFatias(macro: Record<string, number> | null | undefined, base: number): Fatia[] {
  return CARD_ORDER.map((id) => {
    const value = Number(macro?.[id]) || 0;
    return { name: CARD_META[id].label, value, cor: CARD_META[id].cor, brl: (value / 100) * base };
  }).filter((d) => d.value >= PCT_MINIMO);
}

/* ── Medição de texto ─────────────────────────────────────────────────────── */

let ctx: CanvasRenderingContext2D | null | undefined;
const cacheMedidas = new Map<string, number>();

/**
 * Largura em px de um texto na fonte dos rótulos. A truncagem precisa ser por
 * pixel, e não por contagem de caracteres: a fonte do app é Poppins, larga e de
 * avanço variável.
 */
export function medirTexto(txt: string, peso = 500): number {
  const chave = `${peso}|${txt}`;
  const memo = cacheMedidas.get(chave);
  if (memo !== undefined) return memo;

  if (ctx === undefined) {
    ctx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
  }
  let largura: number;
  if (ctx) {
    ctx.font = `${peso} ${FONTE_ROTULO}px Poppins, sans-serif`;
    largura = ctx.measureText(txt).width;
  } else {
    largura = txt.length * FONTE_ROTULO * 0.58; // estimativa para Poppins
  }
  cacheMedidas.set(chave, largura);
  return largura;
}

/** A métrica muda quando a webfont Poppins termina de carregar. */
export function limparCacheMedidas(): void {
  cacheMedidas.clear();
}

function truncar(txt: string, max: number): string {
  if (max <= 0) return "";
  if (medirTexto(txt) <= max) return txt;
  for (let corte = txt.length - 1; corte >= 1; corte--) {
    const tentativa = `${txt.slice(0, corte).trimEnd()}…`;
    if (medirTexto(tentativa) <= max) return tentativa;
  }
  return "…";
}

/* ── Geometria da pizza ───────────────────────────────────────────────────── */

export interface GeometriaPizza {
  largura: number;
  cx: number;
  cy: number;
  outerRadius: number;
  /** Raio onde ficam os cotovelos das linhas de chamada. */
  elbowR: number;
  /** Afastamento horizontal mínimo do cotovelo em relação ao eixo central. */
  minDx: number;
}

/**
 * Deriva os raios da largura real em vez de fixá-los. Acima de ~334px por
 * gráfico o resultado é a geometria cheia (raio 75, cotovelo 103); abaixo disso
 * a pizza cede gradualmente para o texto continuar cabendo dentro do SVG, até o
 * piso `R_MIN` — a partir daí quem cede é o texto, porque uma pizza menor que
 * isso deixa de comunicar qualquer coisa. Em containers muito estreitos a saída
 * certa é empilhar os dois gráficos, não encolher ambos (ver
 * `CardAlocacaoComparativa`).
 */
export function calcularGeometria(largura: number, altura: number): GeometriaPizza {
  const cx = largura / 2;
  const elbowR = Math.max(R_MIN + ELBOW_MIN_PAD, Math.min(R_PREF + ELBOW_PAD, cx - 2 * PAD - TICK - MIN_TEXTO));
  const outerRadius = Math.max(R_MIN, Math.min(R_PREF, elbowR - ELBOW_MIN_PAD, altura / 2 - ACIMA - 2));
  return { largura, cx, cy: altura / 2, outerRadius, elbowR, minDx: MIN_DX_FRAC * elbowR };
}

/* ── Layout dos rótulos ───────────────────────────────────────────────────── */

export interface RotuloPizza {
  index: number;
  /** Âncora no bordo da fatia. */
  x1: number;
  y1: number;
  /** Cotovelo — Y já livre de colisão, X reprojetado na circunferência. */
  ex: number;
  y: number;
  /** Fim do traço horizontal e âncora do texto. */
  tx: number;
  lx: number;
  anchor: "start" | "end";
  cor: string;
  /** Nome já truncado ao espaço disponível deste rótulo. */
  nome: string;
  /** Fração 0–1, normalizada sobre as fatias exibidas. */
  pct: number;
}

/**
 * Posiciona os rótulos de todas as fatias de uma vez. O retorno é indexado pela
 * posição de entrada, para casar com o `index` que o recharts passa no `label`.
 */
export function layoutRotulos(
  fatias: Fatia[],
  geo: GeometriaPizza,
  altura: number,
  paddingAngle = 0,
  anguloInicial = 90,
): RotuloPizza[] {
  const n = fatias.length;
  const total = fatias.reduce((soma, f) => soma + f.value, 0);
  if (n === 0 || total <= 0) return [];

  const { largura, cx, cy, outerRadius, elbowR, minDx } = geo;

  // Mesma matemática de recharts/polar/Pie.js (getComposedData): com o círculo
  // fechado, o padding consome `n * paddingAngle` do total. Ignorar isso fazia a
  // linha de chamada nascer fora do meio da fatia.
  const anguloUtil = 360 - n * paddingAngle;
  let cursor = anguloInicial; // startAngle 90 → endAngle -270: sentido horário

  const base = fatias.map((fatia, index) => {
    if (index > 0) cursor -= paddingAngle;
    const pct = fatia.value / total;
    const abertura = pct * anguloUtil;
    const meio = cursor - abertura / 2;
    cursor -= abertura;

    const cos = Math.cos(-meio * RADIAN);
    const sin = Math.sin(-meio * RADIAN);
    return {
      index,
      lado: cos >= 0 ? 1 : -1,
      x1: cx + (outerRadius + 6) * cos,
      y1: cy + (outerRadius + 6) * sin,
      y: cy + elbowR * sin,
      cor: fatia.cor,
      nome: fatia.name,
      pct,
    };
  });

  // O SVG do recharts tem viewBox e recorta o que sai dele, então os rótulos
  // precisam caber na faixa vertical útil.
  const yMin = PAD + ACIMA;
  const yMax = altura - PAD - ABAIXO;
  // Ordenar por Y preserva a ordem angular dentro de cada lado (em qualquer
  // semicírculo, y é monótono no ângulo), o que mantém as linhas de chamada
  // coerentes com as fatias.
  descolar(base.filter((r) => r.lado > 0).sort(porY), yMin, yMax);
  descolar(base.filter((r) => r.lado < 0).sort(porY), yMin, yMax);

  return base.map((r): RotuloPizza => {
    // Cotovelo de volta à circunferência a partir do Y final: quanto mais o
    // rótulo foi empurrado para longe do equador, mais o cotovelo se aproxima do
    // eixo central — e mais largura sobra para o texto, justamente nos rótulos
    // dos clusters de fatias pequenas, que são os que precisam.
    const dy = r.y - cy;
    const dx = Math.max(Math.sqrt(Math.max(elbowR * elbowR - dy * dy, 0)), minDx);
    const ex = cx + r.lado * dx;
    const tx = ex + r.lado * TICK;
    const lx = tx + r.lado * 2;
    const espaco = r.lado > 0 ? largura - PAD - lx : lx - PAD;

    return {
      index: r.index,
      x1: r.x1,
      y1: r.y1,
      ex,
      y: r.y,
      tx,
      lx,
      anchor: r.lado > 0 ? "start" : "end",
      cor: r.cor,
      nome: truncar(r.nome, espaco),
      pct: r.pct,
    };
  });
}

function porY(a: { y: number; index: number }, b: { y: number; index: number }): number {
  return a.y - b.y || a.index - b.index;
}

/**
 * Afasta os rótulos de um lado até respeitarem a folga mínima, deslocando o
 * mínimo possível e mantendo tudo dentro de [yMin, yMax].
 *
 * Com `z[i] = y[i] − i·folga`, a restrição `y[i+1] − y[i] ≥ folga` vira
 * "z não-decrescente" — uma regressão isotônica, cuja solução exata é o PAVA
 * (pool adjacent violators), numa passada só. O resultado é ótimo em mínimos
 * quadrados sobre as posições naturais: cada aglomerado fica centrado no próprio
 * baricentro, em vez de ser empurrado inteiro para baixo como antes.
 */
function descolar(grupo: { y: number }[], yMin: number, yMax: number): void {
  const n = grupo.length;
  if (n === 0) return;
  if (n === 1) {
    grupo[0].y = Math.min(yMax, Math.max(yMin, grupo[0].y));
    return;
  }

  // Com no máximo 8 fatias e ~215px úteis a folga cheia sempre cabe; a divisão é
  // uma rede de segurança caso a altura do gráfico encolha.
  const folga = Math.min(FOLGA_MIN, (yMax - yMin) / (n - 1));

  const blocos: { soma: number; n: number }[] = [];
  for (let i = 0; i < n; i++) {
    let bloco = { soma: grupo[i].y - i * folga, n: 1 };
    while (blocos.length > 0) {
      const anterior = blocos[blocos.length - 1];
      if (anterior.soma / anterior.n <= bloco.soma / bloco.n) break;
      blocos.pop();
      bloco = { soma: anterior.soma + bloco.soma, n: anterior.n + bloco.n };
    }
    blocos.push(bloco);
  }

  const y: number[] = [];
  let i = 0;
  for (const bloco of blocos) {
    const media = bloco.soma / bloco.n;
    for (let k = 0; k < bloco.n; k++, i++) y.push(media + i * folga);
  }

  // Confina nas bordas sem reintroduzir colisão: como as barreiras avançam de
  // `folga` a cada índice, o max/min preserva a distância mínima entre vizinhos.
  for (let j = 0; j < n; j++) y[j] = Math.max(y[j], yMin + j * folga);
  for (let j = n - 1; j >= 0; j--) y[j] = Math.min(y[j], yMax - (n - 1 - j) * folga);
  for (let j = 0; j < n; j++) grupo[j].y = y[j];
}
