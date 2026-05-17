import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { AtivoItem, MacroAlocacao, MacroClassKey } from "@/lib/carteira/types";
import { MACRO_CLASSES } from "@/lib/carteira/types";
import {
  ALOCACAO_ALVO_POR_PERFIL,
  formatBRL,
  formatPct,
  valorAtivoBRL,
} from "@/lib/carteira/calculos";
import { cn } from "@/lib/utils";

interface Props {
  ativosMeta: AtivoItem[];
  onAtivosMeta: (a: AtivoItem[]) => void;
  ativosAtuais: AtivoItem[];
  patrimonio: number;
  clientProfile: string | null;
  macroAtual: MacroAlocacao;
  usdBrl: number;
}

function genId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function newMetaAtivo(klass: MacroClassKey, subclasse: string): AtivoItem {
  return {
    id: genId(),
    klass,
    subclasse,
    nome: "",
    segmento: "",
    vencimento: "",
    cotacaoBRL: 0,
    cotacaoUSD: 0,
    quantidade: 0,
    posicaoBRL: 0,
    pctAtual: 0,
    pctMeta: 0,
  };
}

interface SectionHeaderProps {
  label: string;
  color: string;
}

function SectionHeader({ label, color }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <h3 className="font-semibold text-sm">{label}</h3>
    </div>
  );
}

const inputCls = "h-7 text-xs px-1.5 w-full min-w-[80px]";

export function Etapa2AlocacaoIdeal({
  ativosMeta,
  onAtivosMeta,
  ativosAtuais,
  patrimonio,
  clientProfile,
  macroAtual,
  usdBrl,
}: Props) {
  const totalPct = useMemo(
    () => ativosMeta.reduce((s, a) => s + a.pctMeta, 0),
    [ativosMeta],
  );

  const profileAlvo = useMemo(
    () => (clientProfile ? ALOCACAO_ALVO_POR_PERFIL[clientProfile] ?? null : null),
    [clientProfile],
  );

  const addAtivo = useCallback(
    (klass: MacroClassKey, subclasse: string) => {
      onAtivosMeta([...ativosMeta, newMetaAtivo(klass, subclasse)]);
    },
    [ativosMeta, onAtivosMeta],
  );

  const updateAtivo = useCallback(
    (id: string, patch: Partial<AtivoItem>) => {
      onAtivosMeta(ativosMeta.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    },
    [ativosMeta, onAtivosMeta],
  );

  const removeAtivo = useCallback(
    (id: string) => {
      onAtivosMeta(ativosMeta.filter((a) => a.id !== id));
    },
    [ativosMeta, onAtivosMeta],
  );

  const copyFromAtual = useCallback(() => {
    const copied: AtivoItem[] = ativosAtuais.map((a) => ({
      ...a,
      id: genId(),
      pctMeta: 0,
      pctAtual: 0,
    }));
    onAtivosMeta(copied);
  }, [ativosAtuais, onAtivosMeta]);

  function getAtualPct(nome: string): number {
    return ativosAtuais.find((a) => a.nome.trim().toLowerCase() === nome.trim().toLowerCase())?.pctAtual ?? 0;
  }

  function getAtualValor(nome: string): number {
    const a = ativosAtuais.find((a) => a.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    return a ? valorAtivoBRL(a, usdBrl) : 0;
  }

  function renderRow(m: AtivoItem, showVencimento = false) {
    const metaValor = (m.pctMeta / 100) * patrimonio;
    const atualValor = getAtualValor(m.nome);
    const diff = metaValor - atualValor;
    return (
      <tr key={m.id} className="border-t border-border/40">
        <td className="px-2 py-1">
          <Input className={inputCls} value={m.nome} placeholder="Nome do ativo" onChange={(e) => updateAtivo(m.id, { nome: e.target.value })} />
        </td>
        <td className="px-2 py-1">
          <Input className={inputCls} value={m.segmento ?? ""} placeholder="Segmento" onChange={(e) => updateAtivo(m.id, { segmento: e.target.value })} />
        </td>
        {showVencimento && (
          <td className="px-2 py-1">
            <Input className={inputCls} value={m.vencimento ?? ""} placeholder="Vencimento" onChange={(e) => updateAtivo(m.id, { vencimento: e.target.value })} />
          </td>
        )}
        <td className="px-2 py-1 text-xs text-right text-muted-foreground">{formatPct(getAtualPct(m.nome))}</td>
        <td className="px-2 py-1">
          <Input
            className={inputCls}
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={m.pctMeta}
            onChange={(e) => updateAtivo(m.id, { pctMeta: Number(e.target.value) })}
          />
        </td>
        <td className="px-2 py-1 text-xs text-right text-muted-foreground whitespace-nowrap">{formatBRL(metaValor)}</td>
        <td className={cn("px-2 py-1 text-xs text-right whitespace-nowrap", diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground")}>
          {diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${formatBRL(diff)}`}
        </td>
        <td className="px-2 py-1">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removeAtivo(m.id)}>×</Button>
        </td>
      </tr>
    );
  }

  function renderTableHeader(showVencimento = false) {
    return (
      <thead className="text-muted-foreground">
        <tr>
          <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Ativo</th>
          <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Segmento</th>
          {showVencimento && <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Vencimento</th>}
          <th className="px-2 py-1 text-left font-normal whitespace-nowrap">% Atual</th>
          <th className="px-2 py-1 text-left font-normal whitespace-nowrap">% Meta</th>
          <th className="px-2 py-1 text-left font-normal whitespace-nowrap">R$ Meta</th>
          <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Diferença R$</th>
          <th className="px-2 py-1"></th>
        </tr>
      </thead>
    );
  }

  const acoes = ativosMeta.filter((a) => a.klass === "rv" && a.subclasse === "Ações");
  const fiis = ativosMeta.filter((a) => a.klass === "rv" && a.subclasse === "FIIs");
  const internacionais = ativosMeta.filter((a) => a.klass === "internacional");
  const rfInflacao = ativosMeta.filter((a) => a.klass === "rf_inflacao");
  const rfPos = ativosMeta.filter((a) => a.klass === "rf_pos");
  const multimercados = ativosMeta.filter((a) => a.klass === "multi");
  const criptos = ativosMeta.filter((a) => a.klass === "cripto");

  const isBalanced = totalPct >= 99 && totalPct <= 101;

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-[240px] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total alocado</span>
            <span className={cn("font-medium", isBalanced ? "text-green-600" : "text-amber-600")}>
              {totalPct.toFixed(1)}% de 100% alocado
            </span>
          </div>
          <Progress value={Math.min(100, totalPct)} className={cn("h-2", isBalanced ? "[&>div]:bg-green-500" : "[&>div]:bg-amber-500")} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={copyFromAtual}>
            Copiar estrutura da carteira atual
          </Button>
        </div>
      </div>

      {/* Profile reference */}
      {clientProfile && profileAlvo && (
        <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium">Alocação recomendada — perfil {clientProfile}</p>
            <span className="text-xs text-muted-foreground">(referência: o consultor decide a alocação final)</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {MACRO_CLASSES.map((c) => {
              const pctAlvo = profileAlvo[c.key];
              const pctAtual = macroAtual[c.key];
              return (
                <div key={c.key} className="flex items-center gap-1 text-xs">
                  <span className="inline-block h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-muted-foreground">{c.label}:</span>
                  <span className="font-medium">{formatPct(pctAlvo)}</span>
                  <span className="text-muted-foreground">(atual: {formatPct(pctAtual)})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Renda Variável Brasil */}
      <div>
        <SectionHeader label="Renda Variável Brasil" color="#10B981" />

        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Ações</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              {renderTableHeader()}
              <tbody>{acoes.map((m) => renderRow(m))}</tbody>
            </table>
          </div>
          <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => addAtivo("rv", "Ações")}>+ Adicionar Ação</Button>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1 font-medium">FIIs</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              {renderTableHeader()}
              <tbody>{fiis.map((m) => renderRow(m))}</tbody>
            </table>
          </div>
          <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => addAtivo("rv", "FIIs")}>+ Adicionar FII</Button>
        </div>
      </div>

      {/* Internacional */}
      <div>
        <SectionHeader label="Internacional" color="#F59E0B" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            {renderTableHeader()}
            <tbody>{internacionais.map((m) => renderRow(m))}</tbody>
          </table>
        </div>
        <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => addAtivo("internacional", "Internacional")}>+ Adicionar Internacional</Button>
      </div>

      {/* Renda Fixa */}
      <div>
        <SectionHeader label="Renda Fixa" color="#1E293B" />

        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1 font-medium">RF Inflação / Resgate Longo</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              {renderTableHeader(true)}
              <tbody>{rfInflacao.map((m) => renderRow(m, true))}</tbody>
            </table>
          </div>
          <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => addAtivo("rf_inflacao", "RF Inflação")}>+ Adicionar RF Inflação</Button>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1 font-medium">RF Pós / Liquidez</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              {renderTableHeader(true)}
              <tbody>{rfPos.map((m) => renderRow(m, true))}</tbody>
            </table>
          </div>
          <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => addAtivo("rf_pos", "RF Pós")}>+ Adicionar RF Pós</Button>
        </div>
      </div>

      {/* Multimercados */}
      <div>
        <SectionHeader label="Multimercados" color="#0EA5E9" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            {renderTableHeader()}
            <tbody>{multimercados.map((m) => renderRow(m))}</tbody>
          </table>
        </div>
        <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => addAtivo("multi", "Multimercado")}>+ Adicionar Multimercado</Button>
      </div>

      {/* Cripto */}
      <div>
        <SectionHeader label="Cripto" color="#8B5CF6" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            {renderTableHeader()}
            <tbody>{criptos.map((m) => renderRow(m))}</tbody>
          </table>
        </div>
        <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => addAtivo("cripto", "Cripto")}>+ Adicionar Cripto</Button>
      </div>
    </div>
  );
}
