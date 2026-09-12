import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GraficoIF } from "@/components/shared/GraficoIF";
import type { PontoProjecao } from "@/lib/financialFreedomCalc";
import type { ObjetivoVida } from "@/types/objetivos";

interface Props {
  projecao: PontoProjecao[];
  patrimonioNecessario?: number;
  curvaIdeal?: (number | null)[];
  objetivos?: ObjetivoVida[];
  mesIF?: number;
  mesNascimento?: number;
  height?: number;
  interativo?: boolean;
  mostrarZoom?: boolean;
  alertaTexto?: ReactNode;
}

export function CardProjecaoPatrimonial({
  projecao,
  patrimonioNecessario,
  curvaIdeal,
  objetivos,
  mesIF,
  mesNascimento,
  height = 420,
  interativo = true,
  mostrarZoom = true,
  alertaTexto,
}: Props) {
  return (
    <Card style={{ border: "0.5px solid #E5E7EB", borderRadius: 12, boxShadow: "none" }}>
      <CardContent className="pt-5">
        <p style={{ color: "#000000", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
          Projeção Patrimonial
        </p>
        <GraficoIF
          projecao={projecao}
          curvaIdeal={curvaIdeal}
          objetivos={objetivos}
          height={height}
          mesIF={mesIF}
          mesNascimento={mesNascimento}
          patrimonioNecessario={patrimonioNecessario}
          interativo={interativo}
          mostrarZoom={mostrarZoom}
        />
        {alertaTexto && (
          <div style={{
            marginTop: 8,
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            padding: "7px 10px",
            background: "#FFFBEB",
            border: "1px solid #FCD34D",
            borderRadius: 8,
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 13, color: "#D97706", flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 11, color: "#78350F", lineHeight: 1.4 }}>
              {alertaTexto}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
