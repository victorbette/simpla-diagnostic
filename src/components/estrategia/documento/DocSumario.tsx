import { PAGINA, HEADER_PAGINA, TITULO_SECAO } from "@/lib/documentoStyles";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  scores: Record<string, number>;
}

const ITENS_SUMARIO = [
  { pagina: 1, label: "Capa",                    cor: "#6B7280"  },
  { pagina: 2, label: "Disclaimer",              cor: "#6B7280"  },
  { pagina: 3, label: "Sumário",                 cor: "#6B7280"  },
  { pagina: 4, label: "Liberdade Financeira",    icone: "ti-beach",       cor: "#059669", scoreKey: "lf"     },
  { pagina: 5, label: "Asset Allocation",        icone: "ti-chart-pie",   cor: "#2563EB", scoreKey: "aa"     },
  { pagina: 6, label: "Proteção e Sucessório",   icone: "ti-shield",      cor: "#B91C1C", scoreKey: "ps"     },
  { pagina: 7, label: "Planejamento Fiscal",     icone: "ti-receipt",     cor: "#B45309", scoreKey: "fiscal" },
  { pagina: 8, label: "Próximos Passos",         icone: "ti-list-checks", cor: "#7C3AED"                     },
  { pagina: 9, label: "Mãos à Obra",             icone: "ti-rocket",      cor: "#1E3A8A"                     },
] as const;

export function DocSumario({ nomeCliente, scores }: Props) {
  return (
    <div style={PAGINA} className="doc-pagina">
      {/* Header */}
      <div style={HEADER_PAGINA()}>
        <div>
          <span style={TITULO_SECAO}>Sumário</span>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B7280" }}>
            Estratégia Inicial · {nomeCliente}
          </p>
        </div>
        <img src="/logo-si.svg" height={24} alt="Simpla Invest" style={{ opacity: 0.6, objectFit: "contain" }} />
      </div>

      {/* TOC */}
      <div>
        {ITENS_SUMARIO.map((item) => {
          const score = "scoreKey" in item ? scores[item.scoreKey] : undefined;
          return (
            <div
              key={item.pagina}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 0",
                borderBottom: "0.5px solid #F3F4F6",
                gap: 16,
              }}
            >
              {/* Número em círculo */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  background: item.cor,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {item.pagina}
              </div>

              {/* Ícone */}
              {"icone" in item && item.icone && (
                <i
                  className={`ti ${item.icone}`}
                  style={{ fontSize: 16, color: item.cor, flexShrink: 0 }}
                  aria-hidden="true"
                />
              )}

              {/* Label */}
              <span style={{ flex: 1, fontSize: 14, color: "#111827", fontWeight: 500 }}>
                {item.label}
              </span>

              {/* Score */}
              {score !== undefined && (
                <span style={{ fontSize: 12, color: "#6B7280", marginRight: 16 }}>
                  Score: {score}/100
                </span>
              )}

              {/* Linha pontilhada */}
              <div
                style={{
                  width: 120,
                  borderBottom: "1px dotted #D1D5DB",
                }}
              />

              {/* Número de página */}
              <span
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 12,
                  textAlign: "right",
                }}
              >
                {item.pagina}
              </span>
            </div>
          );
        })}
      </div>

      <RodapePagina nomeCliente={nomeCliente} numPagina={3} totalPaginas={9} />
    </div>
  );
}
