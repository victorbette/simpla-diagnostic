import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { SecaoEstrategia } from "@/types/estrategiaInicial";
import type { FinancialPlan } from "@/types/financialPlanning";
import { calcularFiscal } from "@/types/financialPlanning";

interface Props {
  secao: SecaoEstrategia;
  onChange: (s: SecaoEstrategia) => void;
  financialPlan: FinancialPlan | null;
}

export function SecaoFiscal({ secao, onChange, financialPlan }: Props) {
  const fiscal = financialPlan?.fiscal ?? null;
  const resultado = fiscal ? calcularFiscal(fiscal) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Planejamento Fiscal</h2>
      </div>

      {resultado && fiscal ? (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Renda bruta anual</p>
              <p className="font-semibold">{formatCurrency(fiscal.rendaBrutaAnual)}</p>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Teto PGBL (12%)</p>
              <p className="font-semibold">{formatCurrency(resultado.tetoPGBL)}</p>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Economia tributária potencial</p>
              <p className="font-semibold text-green-600">
                {formatCurrency(resultado.economiaFiscalPotencial)}
              </p>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Economia fiscal atual</p>
              <p className="font-semibold">{formatCurrency(resultado.economiaFiscalAtual)}</p>
            </div>
          </div>

          {/* Análise previdência */}
          {resultado.analisePrevidencia && (
            <div className="border rounded p-4 bg-muted/40 space-y-1">
              <p className="text-sm font-medium">Análise previdenciária</p>
              <p className="text-sm text-muted-foreground">{resultado.analisePrevidencia}</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum dado fiscal disponível. Preencha o plano financeiro primeiro.
        </p>
      )}

      {/* Editable area */}
      <div className="space-y-2">
        <Label htmlFor="fiscalConteudo">
          Estratégia fiscal e recomendações
        </Label>
        <Textarea
          id="fiscalConteudo"
          value={secao.conteudoAssessor}
          onChange={(ev) =>
            onChange({ ...secao, conteudoAssessor: ev.target.value })
          }
          placeholder="Descreva a estratégia fiscal e as recomendações para o cliente..."
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
