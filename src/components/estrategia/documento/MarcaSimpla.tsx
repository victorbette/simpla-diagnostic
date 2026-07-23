interface Props {
  /** Largura do lockup em px (referência v5: ~150 no topo das páginas escuras) */
  largura?: number;
}

/**
 * Lockup oficial da marca — diamante branco + wordmark "Simpla Invest"
 * (public/simplainvest_logobranca.png). Uso em fundo escuro (capa,
 * divisórias e contracapa), conforme a referência v5.
 */
export function MarcaSimpla({ largura = 150 }: Props) {
  return (
    <img
      src="/simplainvest_logobranca.png"
      alt="Simpla Invest"
      style={{ width: largura, height: "auto", objectFit: "contain", display: "block" }}
    />
  );
}
