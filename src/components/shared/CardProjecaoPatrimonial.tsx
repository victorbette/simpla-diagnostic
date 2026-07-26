import { Card, CardContent } from "@/components/ui/card";
import { GraficoIF } from "@/components/shared/GraficoIF";
import type { PontoProjecao } from "@/lib/financialFreedomCalc";
import type { ObjetivoVida } from "@/types/objetivos";

interface Props {
  projecao: PontoProjecao[];
  patrimonioNecessario?: number;
  objetivos?: ObjetivoVida[];
  mesIF?: number;
  mesNascimento?: number;
  height?: number;
  interativo?: boolean;
}

export function CardProjecaoPatrimonial({
  projecao,
  patrimonioNecessario,
  objetivos,
  mesIF,
  mesNascimento,
  height = 420,
  interativo = true,
}: Props) {
  return (
    <Card style={{ border: "0.5px solid #E5E7EB", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <CardContent className="pt-5">
        <p style={{ color: "#000000", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          Projeção Patrimonial
        </p>
        <GraficoIF
          projecao={projecao}
          objetivos={objetivos}
          height={height}
          mesIF={mesIF}
          mesNascimento={mesNascimento}
          patrimonioNecessario={patrimonioNecessario}
          interativo={interativo}
        />
      </CardContent>
    </Card>
  );
}
