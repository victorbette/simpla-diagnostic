import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AtivoItem, MacroClassKey } from "@/lib/carteira/types";
import { MACRO_CLASSES } from "@/lib/carteira/types";
import {
  atualizarPctAtual,
  formatBRL,
  formatPct,
  totalPatrimonioBRL,
  valorAtivoBRL,
  derivarMacro,
} from "@/lib/carteira/calculos";

interface Props {
  ativos: AtivoItem[];
  onAtivos: (a: AtivoItem[]) => void;
  usdBrl: number;
  onUsdBrl: (v: number) => void;
}

function genId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function newAtivo(klass: MacroClassKey, subclasse: string): AtivoItem {
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

export function Etapa1AlocacaoAtual({ ativos, onAtivos, usdBrl, onUsdBrl }: Props) {
  const addAtivo = useCallback(
    (klass: MacroClassKey, subclasse: string) => {
      const next = [...ativos, newAtivo(klass, subclasse)];
      onAtivos(atualizarPctAtual(next, usdBrl));
    },
    [ativos, onAtivos, usdBrl],
  );

  const updateAtivo = useCallback(
    (id: string, patch: Partial<AtivoItem>) => {
      const next = ativos.map((a) => (a.id === id ? { ...a, ...patch } : a));
      onAtivos(atualizarPctAtual(next, usdBrl));
    },
    [ativos, onAtivos, usdBrl],
  );

  const removeAtivo = useCallback(
    (id: string) => {
      const next = ativos.filter((a) => a.id !== id);
      onAtivos(atualizarPctAtual(next, usdBrl));
    },
    [ativos, onAtivos, usdBrl],
  );

  const macro = derivarMacro(ativos, usdBrl);
  const total = totalPatrimonioBRL(ativos, usdBrl);

  const acoes = ativos.filter((a) => a.klass === "rv" && a.subclasse === "Ações");
  const fiis = ativos.filter((a) => a.klass === "rv" && a.subclasse === "FIIs");
  const internacionais = ativos.filter((a) => a.klass === "internacional");
  const rfInflacao = ativos.filter((a) => a.klass === "rf_inflacao");
  const rfPos = ativos.filter((a) => a.klass === "rf_pos");
  const multimercados = ativos.filter((a) => a.klass === "multi");
  const criptos = ativos.filter((a) => a.klass === "cripto");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      {/* Left: input sections */}
      <div className="space-y-8">

        {/* Renda Variável Brasil */}
        <div>
          <SectionHeader label="Renda Variável Brasil" color="#10B981" />

          {/* Ações */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Ações</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Ativo/Ticker</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Segmento</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Cotação R$</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Qtde</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Valor R$</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">%</th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {acoes.map((a) => (
                    <tr key={a.id} className="border-t border-border/40">
                      <td className="px-2 py-1">
                        <Input className={inputCls} value={a.nome} placeholder="ex: PETR4" onChange={(e) => updateAtivo(a.id, { nome: e.target.value })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className={inputCls} value={a.segmento ?? ""} placeholder="ex: Bancos" onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className={inputCls} type="number" step="0.01" min="0" value={a.cotacaoBRL ?? 0} onChange={(e) => updateAtivo(a.id, { cotacaoBRL: Number(e.target.value) })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className={inputCls} type="number" step="1" min="0" value={a.quantidade ?? 0} onChange={(e) => updateAtivo(a.id, { quantidade: Number(e.target.value) })} />
                      </td>
                      <td className="px-2 py-1 text-xs text-right text-muted-foreground whitespace-nowrap">{formatBRL(valorAtivoBRL(a, usdBrl))}</td>
                      <td className="px-2 py-1 text-xs text-right text-muted-foreground">{formatPct(a.pctAtual)}</td>
                      <td className="px-2 py-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removeAtivo(a.id)}>×</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => addAtivo("rv", "Ações")}>+ Adicionar Ação</Button>
          </div>

          {/* FIIs */}
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">FIIs</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Ativo/Ticker</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Segmento</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Cotação R$</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Qtde</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Valor R$</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">%</th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {fiis.map((a) => (
                    <tr key={a.id} className="border-t border-border/40">
                      <td className="px-2 py-1">
                        <Input className={inputCls} value={a.nome} placeholder="ex: HGLG11" onChange={(e) => updateAtivo(a.id, { nome: e.target.value })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className={inputCls} value={a.segmento ?? ""} placeholder="ex: Galpões" onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className={inputCls} type="number" step="0.01" min="0" value={a.cotacaoBRL ?? 0} onChange={(e) => updateAtivo(a.id, { cotacaoBRL: Number(e.target.value) })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className={inputCls} type="number" step="1" min="0" value={a.quantidade ?? 0} onChange={(e) => updateAtivo(a.id, { quantidade: Number(e.target.value) })} />
                      </td>
                      <td className="px-2 py-1 text-xs text-right text-muted-foreground whitespace-nowrap">{formatBRL(valorAtivoBRL(a, usdBrl))}</td>
                      <td className="px-2 py-1 text-xs text-right text-muted-foreground">{formatPct(a.pctAtual)}</td>
                      <td className="px-2 py-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removeAtivo(a.id)}>×</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => addAtivo("rv", "FIIs")}>+ Adicionar FII</Button>
          </div>
        </div>

        {/* Internacional */}
        <div>
          <SectionHeader label="Internacional" color="#F59E0B" />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">USD/BRL:</span>
            <Input type="number" value={usdBrl} onChange={(e) => onUsdBrl(Number(e.target.value))} step="0.01" className="w-24 h-7 text-xs px-1.5" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Ativo</th>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Segmento</th>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Cotação USD</th>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Qtde</th>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Valor R$</th>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">%</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {internacionais.map((a) => (
                  <tr key={a.id} className="border-t border-border/40">
                    <td className="px-2 py-1">
                      <Input className={inputCls} value={a.nome} placeholder="ex: IVVB11" onChange={(e) => updateAtivo(a.id, { nome: e.target.value })} />
                    </td>
                    <td className="px-2 py-1">
                      <Input className={inputCls} value={a.segmento ?? ""} placeholder="ex: ETF" onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })} />
                    </td>
                    <td className="px-2 py-1">
                      <Input className={inputCls} type="number" step="0.01" min="0" value={a.cotacaoUSD ?? 0} onChange={(e) => updateAtivo(a.id, { cotacaoUSD: Number(e.target.value) })} />
                    </td>
                    <td className="px-2 py-1">
                      <Input className={inputCls} type="number" step="1" min="0" value={a.quantidade ?? 0} onChange={(e) => updateAtivo(a.id, { quantidade: Number(e.target.value) })} />
                    </td>
                    <td className="px-2 py-1 text-xs text-right text-muted-foreground whitespace-nowrap">{formatBRL(valorAtivoBRL(a, usdBrl))}</td>
                    <td className="px-2 py-1 text-xs text-right text-muted-foreground">{formatPct(a.pctAtual)}</td>
                    <td className="px-2 py-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removeAtivo(a.id)}>×</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => addAtivo("internacional", "Internacional")}>+ Adicionar Internacional</Button>
        </div>

        {/* Renda Fixa */}
        <div>
          <SectionHeader label="Renda Fixa" color="#1E293B" />

          {/* RF Inflação */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-1 font-medium">RF Inflação / Resgate Longo</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Ativo/Fundo</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Segmento</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Vencimento</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Posição R$</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">%</th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {rfInflacao.map((a) => (
                    <tr key={a.id} className="border-t border-border/40">
                      <td className="px-2 py-1">
                        <Input className={inputCls} value={a.nome} placeholder="ex: Tesouro IPCA+" onChange={(e) => updateAtivo(a.id, { nome: e.target.value })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className={inputCls} value={a.segmento ?? ""} placeholder="ex: Tesouro Direto" onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className={inputCls} value={a.vencimento ?? ""} placeholder="ex: 15/05/2029" onChange={(e) => updateAtivo(a.id, { vencimento: e.target.value })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className={inputCls} type="number" step="0.01" min="0" value={a.posicaoBRL ?? 0} onChange={(e) => updateAtivo(a.id, { posicaoBRL: Number(e.target.value) })} />
                      </td>
                      <td className="px-2 py-1 text-xs text-right text-muted-foreground">{formatPct(a.pctAtual)}</td>
                      <td className="px-2 py-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removeAtivo(a.id)}>×</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => addAtivo("rf_inflacao", "RF Inflação")}>+ Adicionar RF Inflação</Button>
          </div>

          {/* RF Pós */}
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">RF Pós / Liquidez</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Ativo/Fundo</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Segmento</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Vencimento</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Posição R$</th>
                    <th className="px-2 py-1 text-left font-normal whitespace-nowrap">%</th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {rfPos.map((a) => (
                    <tr key={a.id} className="border-t border-border/40">
                      <td className="px-2 py-1">
                        <Input className={inputCls} value={a.nome} placeholder="ex: CDB Bradesco" onChange={(e) => updateAtivo(a.id, { nome: e.target.value })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className={inputCls} value={a.segmento ?? ""} placeholder="ex: CDB" onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className={inputCls} value={a.vencimento ?? ""} placeholder="ex: D+1, 1 ano" onChange={(e) => updateAtivo(a.id, { vencimento: e.target.value })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className={inputCls} type="number" step="0.01" min="0" value={a.posicaoBRL ?? 0} onChange={(e) => updateAtivo(a.id, { posicaoBRL: Number(e.target.value) })} />
                      </td>
                      <td className="px-2 py-1 text-xs text-right text-muted-foreground">{formatPct(a.pctAtual)}</td>
                      <td className="px-2 py-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removeAtivo(a.id)}>×</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
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
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Fundo</th>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Segmento</th>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Posição R$</th>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">%</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {multimercados.map((a) => (
                  <tr key={a.id} className="border-t border-border/40">
                    <td className="px-2 py-1">
                      <Input className={inputCls} value={a.nome} placeholder="ex: Sharp Long Short" onChange={(e) => updateAtivo(a.id, { nome: e.target.value })} />
                    </td>
                    <td className="px-2 py-1">
                      <Input className={inputCls} value={a.segmento ?? ""} placeholder="ex: Long Short" onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })} />
                    </td>
                    <td className="px-2 py-1">
                      <Input className={inputCls} type="number" step="0.01" min="0" value={a.posicaoBRL ?? 0} onChange={(e) => updateAtivo(a.id, { posicaoBRL: Number(e.target.value) })} />
                    </td>
                    <td className="px-2 py-1 text-xs text-right text-muted-foreground">{formatPct(a.pctAtual)}</td>
                    <td className="px-2 py-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removeAtivo(a.id)}>×</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => addAtivo("multi", "Multimercado")}>+ Adicionar Multimercado</Button>
        </div>

        {/* Cripto */}
        <div>
          <SectionHeader label="Cripto" color="#8B5CF6" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Ativo</th>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Cotação R$</th>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Qtde</th>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">Posição R$</th>
                  <th className="px-2 py-1 text-left font-normal whitespace-nowrap">%</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {criptos.map((a) => (
                  <tr key={a.id} className="border-t border-border/40">
                    <td className="px-2 py-1">
                      <Input className={inputCls} value={a.nome} placeholder="ex: BTC" onChange={(e) => updateAtivo(a.id, { nome: e.target.value })} />
                    </td>
                    <td className="px-2 py-1">
                      <Input className={inputCls} type="number" step="0.01" min="0" value={a.cotacaoBRL ?? 0} onChange={(e) => updateAtivo(a.id, { cotacaoBRL: Number(e.target.value) })} />
                    </td>
                    <td className="px-2 py-1">
                      <Input className={inputCls} type="number" step="1" min="0" value={a.quantidade ?? 0} onChange={(e) => updateAtivo(a.id, { quantidade: Number(e.target.value) })} />
                    </td>
                    <td className="px-2 py-1 text-xs text-right text-muted-foreground whitespace-nowrap">{formatBRL(valorAtivoBRL(a, usdBrl))}</td>
                    <td className="px-2 py-1 text-xs text-right text-muted-foreground">{formatPct(a.pctAtual)}</td>
                    <td className="px-2 py-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removeAtivo(a.id)}>×</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => addAtivo("cripto", "Cripto")}>+ Adicionar Cripto</Button>
        </div>
      </div>

      {/* Right: sticky sidebar */}
      <div className="sticky top-24 self-start space-y-4">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h3 className="font-semibold text-sm">Alocação macro atual</h3>

          {/* Total patrimônio */}
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">Total patrimônio</p>
            <p className="font-semibold text-sm">{formatBRL(total)}</p>
          </div>

          {/* Stacked bar */}
          <div>
            <div className="flex w-full h-8 rounded overflow-hidden">
              {total === 0 ? (
                <div className="flex-1 bg-muted" />
              ) : (
                MACRO_CLASSES.map((c) => {
                  const pct = macro[c.key];
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={c.key}
                      title={`${c.label}: ${formatPct(pct)}`}
                      style={{ width: `${pct}%`, backgroundColor: c.color }}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-0.5 text-left font-normal">Classe</th>
                <th className="py-0.5 text-right font-normal">R$</th>
                <th className="py-0.5 text-right font-normal">%</th>
              </tr>
            </thead>
            <tbody>
              {MACRO_CLASSES.map((c) => {
                const pct = macro[c.key];
                const value = (pct / 100) * total;
                return (
                  <tr key={c.key} className="border-t border-border/30">
                    <td className="py-0.5 flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="truncate">{c.label}</span>
                    </td>
                    <td className="py-0.5 text-right text-muted-foreground">{formatBRL(value)}</td>
                    <td className="py-0.5 text-right text-muted-foreground">{formatPct(pct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
