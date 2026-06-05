interface Props {
  nomeCliente: string;
  numPagina: number;
  totalPaginas: number;
}

export function RodapePagina({ nomeCliente, numPagina, totalPaginas }: Props) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 32,
        left: 72,
        right: 72,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: "0.5px solid #E5E7EB",
        paddingTop: 12,
      }}
    >
      <span style={{ fontSize: 10, color: "#9CA3AF" }}>
        Estratégia Inicial · {nomeCliente}
      </span>
      <img src="/logo-si.svg" height={16} alt="Simpla Invest" style={{ opacity: 0.35, objectFit: "contain" }} />
      <span style={{ fontSize: 10, color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
        {numPagina}&thinsp;/&thinsp;{totalPaginas}
      </span>
    </div>
  );
}
