import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { SecaoEstrategia } from "@/types/estrategiaInicial";
import type { FinancialPlan } from "@/types/financialPlanning";
import { calcularSucessorio } from "@/types/financialPlanning";

interface Props {
  secao: SecaoEstrategia;
  onChange: (s: SecaoEstrategia) => void;
  financialPlan: FinancialPlan | null;
}

interface CheckItem {
  label: string;
  ok: boolean;
}

export function SecaoSucessorio({ secao, onChange, financialPlan }: Props) {
  const suc = financialPlan?.sucessorio ?? null;
  const resultado = suc ? calcularSucessorio(suc) : null;

  const checkItems: CheckItem[] = suc
    ? [
        { label: "Possui testamento", ok: suc.possuiTestamento },
        { label: "Possui holding familiar", ok: suc.possuiHolding },
        { label: "Possui seguro de vida para sucessão", ok: suc.possuiSeguroVidaSucessao },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Planejamento Sucessório</h2>
      </div>

      {resultado && suc ? (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">ITCMD estimado</p>
              <p className="font-semibold text-red-600">
                {formatCurrency(resultado.itcmdEstimado)}
              </p>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Custo do inventário</p>
              <p className="font-semibold text-red-600">
                {formatCurrency(resultado.custoInventarioEstimado)}
              </p>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Custo total estimado</p>
              <p className="font-semibold text-red-600">
                {formatCurrency(resultado.custoTotal)}
              </p>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">% do patrimônio em custos</p>
              <p
                className={cn(
                  "font-semibold",
                  resultado.percentualCusto > 15 ? "text-red-600" : "text-amber-600"
                )}
              >
                {resultado.percentualCusto.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Holding / seguro vida info */}
          <div className="border rounded p-4 bg-muted/40 space-y-1">
            <p className="text-sm font-medium">Estruturas de proteção patrimonial</p>
            <p className="text-sm text-muted-foreground">
              Holding familiar:{" "}
              <span className={cn("font-medium", suc.possuiHolding ? "text-green-600" : "text-red-500")}>
                {suc.possuiHolding ? "Possui" : "Não possui"}
              </span>
              {" · "}
              Seguro de vida sucessório:{" "}
              <span className={cn("font-medium", suc.possuiSeguroVidaSucessao ? "text-green-600" : "text-red-500")}>
                {suc.possuiSeguroVidaSucessao ? "Possui" : "Não possui"}
              </span>
            </p>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Checklist sucessório</p>
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
          Nenhum dado sucessório disponível. Preencha o plano financeiro primeiro.
        </p>
      )}

      {/* Editable area */}
      <div className="space-y-2">
        <Label htmlFor="sucConteudo">
          Estratégia sucessória e ferramentas recomendadas
        </Label>
        <Textarea
          id="sucConteudo"
          value={secao.conteudoAssessor}
          onChange={(ev) =>
            onChange({ ...secao, conteudoAssessor: ev.target.value })
          }
          placeholder="Descreva a estratégia sucessória e as ferramentas recomendadas..."
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
