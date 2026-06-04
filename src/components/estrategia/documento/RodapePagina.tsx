interface Props {
  pagina: number;
  total?: number;
  clientName?: string;
}

export function RodapePagina({ pagina, total = 9, clientName }: Props) {
  return (
    <div
      style={{
        marginTop: 40,
        paddingTop: 16,
        borderTop: "1px solid #E5E7EB",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 11,
        color: "#9CA3AF",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img src="/logo-si.svg" alt="" style={{ height: 14, width: 14, objectFit: "contain", opacity: 0.35 }} />
        <span>Simpla Invest · Financial Planning</span>
      </div>
      {clientName ? (
        <span style={{ color: "#6B7280" }}>{clientName}</span>
      ) : (
        <span />
      )}
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {pagina}&thinsp;/&thinsp;{total}
      </span>
    </div>
  );
}
