import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurrencyInput";
import { cn } from "@/lib/utils";
import {
  SUITABILITY_PERGUNTAS,
  ALOCACAO_ALVO,
  PERFIL_LABELS,
  calcularPerfil,
} from "@/types/financialPlanning";
import type {
  DadosCliente,
  SuitabilityResposta,
  PerfilRisco,
} from "@/types/financialPlanning";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const PROFILE_COLORS: Record<PerfilRisco, string> = {
  conservador: "bg-blue-100 text-blue-800 border-blue-300",
  conservador_moderado: "bg-teal-100 text-teal-800 border-teal-300",
  moderado: "bg-amber-100 text-amber-800 border-amber-300",
  arrojado: "bg-rose-100 text-rose-800 border-rose-300",
};

interface Props {
  value: DadosCliente;
  onChange: (v: DadosCliente) => void;
  onComplete: (v: DadosCliente) => void;
}

type SuitabilityStep = "questions" | "result";

export function ColetaDadosForm({ value, onChange, onComplete }: Props) {
  const set = <K extends keyof DadosCliente>(key: K, val: DadosCliente[K]) =>
    onChange({ ...value, [key]: val });

  const [suitStep, setSuitStep] = useState<SuitabilityStep>(
    value.suitabilityPerfil ? "result" : "questions"
  );
  const [qIndex, setQIndex] = useState(0);
  const [respostas, setRespostas] = useState<Map<string, SuitabilityResposta>>(
    () => {
      const m = new Map<string, SuitabilityResposta>();
      value.suitabilityRespostas.forEach((r) => m.set(r.perguntaId, r));
      return m;
    }
  );

  const total = SUITABILITY_PERGUNTAS.length;
  const pergunta = SUITABILITY_PERGUNTAS[qIndex];
  const respostaSelecionada = respostas.get(pergunta?.id ?? "");
  const isLastQ = qIndex === total - 1;

  function selectOption(valor: number) {
    setRespostas((prev) => {
      const next = new Map(prev);
      next.set(pergunta.id, { perguntaId: pergunta.id, valor });
      return next;
    });
  }

  function handleSuitNext() {
    if (!respostaSelecionada) return;
    if (isLastQ) {
      const allRespostas = Array.from(respostas.values());
      const calc = calcularPerfil(allRespostas);
      onChange({
        ...value,
        suitabilityRespostas: allRespostas,
        suitabilityPerfil: calc.perfil,
        suitabilityPontuacao: calc.totalPontos,
      });
      setSuitStep("result");
    } else {
      setQIndex((i) => i + 1);
    }
  }

  function handleConfirmarPerfil() {
    const updated: DadosCliente = {
      ...value,
      suitabilityRespostas: Array.from(respostas.values()),
    };
    onComplete(updated);
  }

  const perfil = value.suitabilityPerfil;
  const progressPct = ((qIndex + 1) / total) * 100;

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold">Coleta de dados do cliente</h2>

      {/* ── Seção 1: Dados Pessoais ── */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold border-b pb-2">Dados Pessoais</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dc-nascimento">Data de nascimento</Label>
            <Input
              id="dc-nascimento"
              type="date"
              value={value.dataNascimento}
              onChange={(e) => set("dataNascimento", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dc-civil">Estado civil</Label>
            <Select
              value={value.estadoCivil}
              onValueChange={(v) => set("estadoCivil", v as DadosCliente["estadoCivil"])}
            >
              <SelectTrigger id="dc-civil">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                <SelectItem value="casado">Casado(a)</SelectItem>
                <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                <SelectItem value="uniao_estavel">União estável</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dc-cidade">Cidade</Label>
            <Input
              id="dc-cidade"
              value={value.cidade}
              onChange={(e) => set("cidade", e.target.value)}
              placeholder="Ex: São Paulo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dc-estado">Estado (UF)</Label>
            <Select
              value={value.estado}
              onValueChange={(v) => set("estado", v)}
            >
              <SelectTrigger id="dc-estado">
                <SelectValue placeholder="UF..." />
              </SelectTrigger>
              <SelectContent>
                {UFS.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="dc-filhos"
            checked={value.temFilhos}
            onCheckedChange={(v) => set("temFilhos", v)}
          />
          <Label htmlFor="dc-filhos" className="cursor-pointer">Tem filhos?</Label>
        </div>
        {value.temFilhos && (
          <div className="ml-8 space-y-1.5 max-w-xs">
            <Label htmlFor="dc-nfilhos">Número de filhos</Label>
            <Input
              id="dc-nfilhos"
              type="number"
              min={1}
              max={20}
              value={value.numeroFilhos || ""}
              onChange={(e) => set("numeroFilhos", parseInt(e.target.value, 10) || 0)}
            />
          </div>
        )}
      </section>

      {/* ── Seção 2: Situação Financeira ── */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold border-b pb-2">Situação Financeira</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { id: "dc-renda", label: "Renda mensal", key: "rendaMensal" as const },
            { id: "dc-custo", label: "Custo de vida mensal", key: "custoDeVidaMensal" as const },
            { id: "dc-aporte", label: "Aporte mensal médio", key: "aportesMensalMedio" as const },
            { id: "dc-fatura", label: "Fatura de cartão mensal", key: "valorFaturaCartao" as const },
            { id: "dc-patfin", label: "Patrimônio financeiro estimado", key: "patrimonioFinanceiroEstimado" as const },
            { id: "dc-pattot", label: "Patrimônio total estimado", key: "patrimonioTotalEstimado" as const },
          ].map(({ id, label, key }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={id}>{label}</Label>
              <CurrencyInput
                id={id}
                value={value[key]}
                onChange={(v) => set(key, v)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Seção 3: Proteção Atual ── */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold border-b pb-2">Proteção Atual</h3>
        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <Switch
              id="dc-svida"
              checked={value.temSeguroVida}
              onCheckedChange={(v) => set("temSeguroVida", v)}
            />
            <Label htmlFor="dc-svida" className="cursor-pointer">Possui seguro de vida?</Label>
          </div>
          {value.temSeguroVida && (
            <div className="ml-8 space-y-1.5 max-w-xs">
              <Label className="text-sm">Capital segurado (apólice)</Label>
              <CurrencyInput
                value={value.valorApoliceVida}
                onChange={(v) => set("valorApoliceVida", v)}
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <Switch
              id="dc-sinval"
              checked={value.temSeguroInvalidez}
              onCheckedChange={(v) => set("temSeguroInvalidez", v)}
            />
            <Label htmlFor="dc-sinval" className="cursor-pointer">Possui seguro de invalidez?</Label>
          </div>
          {value.temSeguroInvalidez && (
            <div className="ml-8 space-y-1.5 max-w-xs">
              <Label className="text-sm">Capital segurado (invalidez)</Label>
              <CurrencyInput
                value={value.valorApoliceInvalidez}
                onChange={(v) => set("valorApoliceInvalidez", v)}
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Seção 4: Vínculo Profissional ── */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold border-b pb-2">Vínculo Profissional</h3>
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="dc-trabalho">Tipo de vínculo</Label>
          <Select
            value={value.tipoTrabalho}
            onValueChange={(v) => set("tipoTrabalho", v as DadosCliente["tipoTrabalho"])}
          >
            <SelectTrigger id="dc-trabalho">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clt">CLT (empregado)</SelectItem>
              <SelectItem value="autonomo">Autônomo / Freelancer</SelectItem>
              <SelectItem value="empresario">Empresário / CNPJ</SelectItem>
              <SelectItem value="concursado">Servidor público / Concursado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* ── Seção 5: Perfil de Risco ── */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold border-b pb-2">Perfil de Risco (Suitability ANBIMA)</h3>

        {suitStep === "questions" && (
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Pergunta {qIndex + 1} de {total}</span>
                <Badge variant="secondary">{Math.round(progressPct)}%</Badge>
              </div>
              <Progress value={progressPct} className="h-1.5" />
            </div>

            <p className="text-base font-medium leading-snug">{pergunta.pergunta}</p>

            <div className="grid gap-2">
              {pergunta.opcoes.map((opcao) => {
                const selected = respostaSelecionada?.valor === opcao.valor;
                return (
                  <button
                    key={opcao.valor}
                    type="button"
                    onClick={() => selectOption(opcao.valor)}
                    className={cn(
                      "w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all",
                      selected
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    {opcao.texto}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (qIndex > 0) setQIndex((i) => i - 1);
                }}
                disabled={qIndex === 0}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                disabled={!respostaSelecionada}
                onClick={handleSuitNext}
              >
                {isLastQ ? "Ver resultado" : "Próxima"}
                {!isLastQ && <ChevronRight className="ml-1 h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {suitStep === "result" && perfil && (
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Perfil identificado:</span>
                <Badge className={cn("text-sm px-3 py-1", PROFILE_COLORS[perfil])}>
                  {PERFIL_LABELS[perfil]}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Macroalocação sugerida</p>
                {(Object.entries(ALOCACAO_ALVO[perfil]) as [string, number][]).map(([key, pct]) => (
                  <div key={key} className="flex items-center gap-3 text-sm">
                    <span className="w-40 shrink-0 text-muted-foreground capitalize">
                      {key === "rendaFixa" ? "Renda Fixa" : key === "rvGlobal" ? "RV Global" : key === "rfGlobal" ? "RF Global" : key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                    <div className="flex-1">
                      <Progress value={pct} className="h-1.5" />
                    </div>
                    <span className="w-10 text-right font-medium tabular-nums">{pct}%</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSuitStep("questions");
                    setQIndex(0);
                  }}
                >
                  Refazer
                </Button>
                <Button size="sm" onClick={handleConfirmarPerfil}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Confirmar perfil e continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
