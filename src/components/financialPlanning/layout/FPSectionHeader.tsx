interface Props {
  title: string;
  subtitle?: string;
  borderColor: string;
  className?: string;
}

export function FPSectionHeader({ title, subtitle, borderColor, className = "" }: Props) {
  return (
    <div
      className={className}
      style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: 12 }}
    >
      <h4 style={{ fontWeight: 700, fontSize: 16, color: "#000000", margin: 0 }}>
        {title}
      </h4>
      {subtitle && (
        <p style={{ fontSize: 13, color: "#6B6347", margin: "2px 0 0" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
