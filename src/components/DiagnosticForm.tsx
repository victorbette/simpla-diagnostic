import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurrencyInput";
import type { DiagnosticAnswers } from "@/hooks/useDiagnosticEngine";
import { useState } from "react";

interface DiagnosticFormProps {
  answers: DiagnosticAnswers;
  onChange: <K extends keyof DiagnosticAnswers>(key: K, value: DiagnosticAnswers[K]) => void;
  onFinish: () => void;
  onCancel: () => void;
}

const TOTAL_STEPS = 8;

const STEP_TITLES = [
  "Liquidez",
  "Sucessão",
  "Estratégia",
  "Câmbio",
  "Inflação",
  "Objetivos de Vida",
  "Liberdade Financeira",
  "Notas do Consultor",
];

function SwitchRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <Label htmlFor={id} className="cursor-pointer leading-tight">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function DiagnosticForm({ answers, onChange, onFinish, onCancel }: DiagnosticFormProps) {
  const [step, setStep] = useState(1);
  const progress = Math.round((step / TOTAL_STEPS) * 100);

  function prev() {
    setStep((s) => Math.max(1, s - 1));
  }

  function next() {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else onFinish();
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {step}. {STEP_TITLES[step - 1]}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {step} / {TOTAL_STEPS}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label htmlFor="emergencyMonths">Meses de reserva de emergência</Label>
              <Input
                id="emergencyMonths"
                type="number"
                min={0}
                max={60}
                value={answers.emergencyMonths}
                onChange={(e) => onChange("emergencyMonths", Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Quantos meses de despesas mensais estão cobertos pela reserva.
              </p>
            </div>
            <SwitchRow
              id="emergencyAccessible"
              label="A reserva está em ativo de liquidez diária (D+0 ou D+1)?"
              checked={answers.emergencyAccessible}
              onCheckedChange={(v) => onChange("emergencyAccessible", v)}
            />
            <SwitchRow
              id="hasShortTermGoal"
              label="Possui objetivo financeiro de curto prazo (< 12 meses)?"
              checked={answers.hasShortTermGoal}
              onCheckedChange={(v) => onChange("hasShortTermGoal", v)}
            />
          </>
        )}

        {step === 2 && (
          <>
            <SwitchRow
              id="hasWill"
              label="Possui testamento formalizado?"
              checked={answers.hasWill}
              onCheckedChange={(v) => onChange("hasWill", v)}
            />
            <SwitchRow
              id="hasHolding"
              label="Possui holding patrimonial constituída?"
              checked={answers.hasHolding}
              onCheckedChange={(v) => onChange("hasHolding", v)}
            />
            <SwitchRow
              id="hasLifeInsuranceForSuccession"
              label="Possui seguro de vida com finalidade sucessória?"
              checked={answers.hasLifeInsuranceForSuccession}
              onCheckedChange={(v) => onChange("hasLifeInsuranceForSuccession", v)}
            />
          </>
        )}

        {step === 3 && (
          <>
            <div className="space-y-2">
              <Label>Nível de diversificação da carteira</Label>
              <Select
                value={answers.diversificationLevel}
                onValueChange={(v) =>
                  onChange(
                    "diversificationLevel",
                    v as DiagnosticAnswers["diversificationLevel"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma — concentrado em 1 ativo/classe</SelectItem>
                  <SelectItem value="low">Baixa — 2 a 3 classes</SelectItem>
                  <SelectItem value="medium">Moderada — 4 a 6 classes</SelectItem>
                  <SelectItem value="high">Alta — 7+ classes e geografias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SwitchRow
              id="hasInternationalAssets"
              label="Possui ativos internacionais na carteira?"
              checked={answers.hasInternationalAssets}
              onCheckedChange={(v) => onChange("hasInternationalAssets", v)}
            />
            <SwitchRow
              id="hasAlternativeAssets"
              label="Possui ativos alternativos (private equity, hedge funds, etc.)?"
              checked={answers.hasAlternativeAssets}
              onCheckedChange={(v) => onChange("hasAlternativeAssets", v)}
            />
            <SwitchRow
              id="reviewsPortfolioRegularly"
              label="Revisa a carteira regularmente com consultor?"
              checked={answers.reviewsPortfolioRegularly}
              onCheckedChange={(v) => onChange("reviewsPortfolioRegularly", v)}
            />
          </>
        )}

        {step === 4 && (
          <>
            <div className="space-y-2">
              <Label>Nível de exposição cambial</Label>
              <Select
                value={answers.fxExposureLevel}
                onValueChange={(v) =>
                  onChange("fxExposureLevel", v as DiagnosticAnswers["fxExposureLevel"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="low">Baixa (&lt; 10% do patrimônio)</SelectItem>
                  <SelectItem value="medium">Média (10–30% do patrimônio)</SelectItem>
                  <SelectItem value="high">Alta (&gt; 30% do patrimônio)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SwitchRow
              id="hasFxProtection"
              label="Possui proteção cambial ativa (hedge, opções, etc.)?"
              checked={answers.hasFxProtection}
              onCheckedChange={(v) => onChange("hasFxProtection", v)}
            />
          </>
        )}

        {step === 5 && (
          <>
            <SwitchRow
              id="hasRealAssets"
              label="Possui ativos reais (imóveis, ouro, commodities)?"
              checked={answers.hasRealAssets}
              onCheckedChange={(v) => onChange("hasRealAssets", v)}
            />
            <SwitchRow
              id="hasIPCALinkedAssets"
              label="Possui ativos indexados ao IPCA (NTN-B, debêntures IPCA+)?"
              checked={answers.hasIPCALinkedAssets}
              onCheckedChange={(v) => onChange("hasIPCALinkedAssets", v)}
            />
            <SwitchRow
              id="inflationProtectionAdequate"
              label="A proteção contra inflação é considerada adequada ao perfil?"
              checked={answers.inflationProtectionAdequate}
              onCheckedChange={(v) => onChange("inflationProtectionAdequate", v)}
            />
          </>
        )}

        {step === 6 && (
          <>
            <SwitchRow
              id="hasDocumentedGoals"
              label="Possui objetivos financeiros documentados formalmente?"
              checked={answers.hasDocumentedGoals}
              onCheckedChange={(v) => onChange("hasDocumentedGoals", v)}
            />
            <SwitchRow
              id="goalsHaveDeadline"
              label="As metas possuem prazos definidos?"
              checked={answers.goalsHaveDeadline}
              onCheckedChange={(v) => onChange("goalsHaveDeadline", v)}
            />
            <SwitchRow
              id="goalsHaveDedicatedAccount"
              label="Os investimentos estão segregados por objetivo?"
              checked={answers.goalsHaveDedicatedAccount}
              onCheckedChange={(v) => onChange("goalsHaveDedicatedAccount", v)}
            />
          </>
        )}

        {step === 7 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentAge">Idade atual</Label>
                <Input
                  id="currentAge"
                  type="number"
                  min={18}
                  max={100}
                  value={answers.currentAge}
                  onChange={(e) => onChange("currentAge", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fireTargetAge">Idade alvo para independência</Label>
                <Input
                  id="fireTargetAge"
                  type="number"
                  min={18}
                  max={100}
                  value={answers.fireTargetAge}
                  onChange={(e) => onChange("fireTargetAge", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyPassiveIncome">Renda passiva mensal atual</Label>
              <CurrencyInput
                id="monthlyPassiveIncome"
                value={answers.monthlyPassiveIncome}
                onChange={(v) => onChange("monthlyPassiveIncome", v)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetPassiveIncome">Meta de renda passiva mensal</Label>
              <CurrencyInput
                id="targetPassiveIncome"
                value={answers.targetPassiveIncome}
                onChange={(v) => onChange("targetPassiveIncome", v)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalInvestedAssets">Patrimônio investido total</Label>
              <CurrencyInput
                id="totalInvestedAssets"
                value={answers.totalInvestedAssets}
                onChange={(v) => onChange("totalInvestedAssets", v)}
              />
            </div>
          </>
        )}

        {step === 8 && (
          <div className="space-y-2">
            <Label htmlFor="consultorNotes">Observações do consultor</Label>
            <Textarea
              id="consultorNotes"
              rows={8}
              placeholder="Registre informações relevantes sobre o cliente, contexto do diagnóstico ou observações adicionais..."
              value={answers.consultorNotes}
              onChange={(e) => onChange("consultorNotes", e.target.value)}
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={prev} disabled={step === 1}>
            Anterior
          </Button>
          <Button onClick={next}>
            {step === TOTAL_STEPS ? "Gerar diagnóstico" : "Próximo"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
