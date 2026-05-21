interface Props {
  label: string;
  value: string;
  hint?: string;
  id?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  border: "1px solid #E2DCC8",
  borderRadius: 8,
  padding: "0 14px",
  fontSize: 14,
  backgroundColor: "#F0FDFA",
  color: "#3D3520",
  cursor: "default",
  outline: "none",
  boxSizing: "border-box",
};

export function FPAutoField({ label, value, hint, id }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label
          htmlFor={id}
          style={{ fontSize: 13, fontWeight: 500, color: "#3D3520" }}
        >
          {label}
        </label>
        <span
          style={{
            backgroundColor: "#F0FDFA",
            color: "#0F766E",
            border: "1px solid #99F6E4",
            borderRadius: 4,
            fontSize: 10,
            padding: "2px 6px",
            fontWeight: 700,
            letterSpacing: "0.03em",
            whiteSpace: "nowrap",
          }}
        >
          ✓ CALCULADO
        </span>
      </div>
      <div style={{ borderLeft: "3px solid #BBA866", borderRadius: "0 8px 8px 0" }}>
        <input
          id={id}
          readOnly
          value={value}
          style={inputStyle}
        />
      </div>
      {hint && (
        <p style={{ fontSize: 11, color: "#9E9070", fontStyle: "italic", margin: 0 }}>
          {hint}
        </p>
      )}
    </div>
  );
}
