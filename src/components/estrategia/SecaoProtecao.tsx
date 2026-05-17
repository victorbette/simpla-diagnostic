import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { SecaoEstrategia } from "@/types/estrategiaInicial";
import type { FinancialPlan } from "@/types/financialPlanning";
import { calcularProtecao } from "@/types/financialPlanning";

interface Props {
  secao: SecaoEstrategia;
  onChange: (s: SecaoEstrategia) => void;
  financialPlan: FinancialPlan | null;
}

interface CheckItem {
  label: string;
  ok: boolean;
}

export function SecaoProtecao({ secao, onChange, financialPlan }: Props) {
  const prot = financialPlan?.protecao ?? null;
  const resultado = prot ? calcularProtecao(prot) : null;

  const checkItems: CheckItem[] = prot
    ? [
        { label: "Possui seguro de vida", ok: prot.possuiSeguroVida },
        {
          label: "Capital segurado adequado",
          ok:
            prot.possuiSeguroVida &&
            resultado !== null &&
            resultado.gap === 0,
        },
        { label: "Possui seguro de invalidez", ok: prot.possuiSeguroInvalidez },
        { label: "Possui plano de saúde", ok: prot.possuiPlanoSaude },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Proteção</h2>
      </div>

      {resultado && prot ? (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Capital necessário</p>
              <p className="font-semibold">{formatCurrency(resultado.capitalNecessario)}</p>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Capital atual</p>
              <p className="font-semibold">{formatCurrency(resultado.capitalAtual)}</p>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Gap</p>
              <p
                className={cn(
                  "font-semibold",
                  resultado.gap > 0 ? "text-red-600" : "text-green-600"
                )}
              >
                {resultado.gap > 0 ? "-" : ""}
                {formatCurrency(resultado.gap)}
              </p>
            </div>
          </div>

          {/* Coverage progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cobertura atual</span>
              <span className="font-medium">{resultado.percentualCoberto.toFixed(1)}%</span>
            </div>
            <Progress value={resultado.percentualCoberto} className="h-3" />
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Checklist de proteção</p>
            <ul className="space-y-1">
              {checkItems.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "font-bold",
                      item.ok ? "text-green-600" : "text-red-500"
                    )}
                  >
                    {item.ok ? "✓" : "✗"}
                  </span>
                  <span className={item.ok ? "" : "text-muted-foreground"}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          {resultado.recomendacoes.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Recomendações automáticas</p>
              <ul className="list-disc list-inside space-y-1">
                {resultado.recomendacoes.map((rec) => (
                  <li key={rec} className="text-sm text-muted-foreground">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum dado de proteção disponível. Preencha o plano financeiro primeiro.
        </p>
      )}

      {/* Editable area */}
      <div className="space-y-2">
        <Label htmlFor="protConteudo">
          Estratégia de proteção e encaminhamentos
        </Label>
        <Textarea
          id="protConteudo"
          value={secao.conteudoAssessor}
          onChange={(ev) =>
            onChange({ ...secao, conteudoAssessor: ev.target.value })
          }
          placeholder="Descreva a estratégia de proteção e os encaminhamentos necessários..."
          className="min-h-[140px]"
          disabled={secao.completa}
        />
      </div>

      <Button
        variant={secao.completa ? "outline" : "default"}
        onClick={() => onChange({ ...secao, completa: !secao.completa })}
      >
        {secao.completa ? "Editar" : "Marcar como completa"}
      </Button>
    </div>
  );
}
