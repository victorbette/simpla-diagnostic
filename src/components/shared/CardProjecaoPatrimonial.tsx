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
  taxaLabel?: string;
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
  taxaLabel,
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
        {taxaLabel && (
          <div style={{
            marginTop: 6,
            fontSize: 10,
            color: "#9CA3AF",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <span style={{
              width: 10, height: 2,
              background: "#9CA3AF",
              display: "inline-block",
              borderRadius: 99,
            }} />
            Taxa utilizada: {taxaLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
