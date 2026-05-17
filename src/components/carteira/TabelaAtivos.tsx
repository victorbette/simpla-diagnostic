import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SimplaCard } from "@/lib/carteira/segmentos";
import { segmentoPadrao } from "@/lib/carteira/segmentos";
import { calcularValorBRL, genId, formatBRL, formatPct } from "@/lib/carteira/calculos";
import type { Ativo } from "@/lib/carteira/types";
import { SegmentoSelect } from "./SegmentoSelect";

interface Props {
  card: SimplaCard;
  ativos: Ativo[];
  onChange: (ativos: Ativo[]) => void;
  patrimonio: number;
  usdBrl?: number;
  modo: "atual" | "recomendada";
  ativosAtuaisRef?: Ativo[];
  disabled?: boolean;
}

export function TabelaAtivos({
  card,
  ativos,
  onChange,
  patrimonio,
  usdBrl = 5,
  modo,
  ativosAtuaisRef = [],
  disabled = false,
}: Props) {
  function addAtivo() {
    const novo: Ativo = {
      id: genId(),
      card: card.id,
      segmento: segmentoPadrao(card.id),
      nome: "",
      valorBRL: 0,
      pctCarteira: 0,
      pctMeta: 0,
      valorMetaBRL: 0,
    };
    onChange([...ativos, novo]);
  }

  function updateAtivo(id: string, patch: Partial<Ativo>) {
    const updated = ativos.map((a) => (a.id === id ? { ...a, ...patch } : a));
    const withValues = updated.map((a) => ({
      ...a,
      valorBRL: calcularValorBRL(a, usdBrl),
    }));
    onChange(withValues);
  }

  function removeAtivo(id: string) {
    onChange(ativos.filter((a) => a.id !== id));
  }

  const subtotal = ativos.reduce((s, a) => s + a.valorBRL, 0);
  const subtotalPct = ativos.reduce((s, a) => s + a.pctCarteira, 0);
  const totalPctMeta = ativos.reduce((s, a) => s + (a.pctMeta ?? 0), 0);

  const thCls = "px-3 py-2 text-left text-xs font-normal text-muted-foreground whitespace-nowrap";
  const tdCls = "px-3 py-1.5";

  // ── MODO ATUAL ─────────────────────────────────────────────────────────────

  if (modo === "atual") {
    // posicao_brl: resgate_rapido, resgate_longo
    if (card.inputTipo === "posicao_brl") {
      return (
        <div>
          {ativos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              Nenhum ativo. Clique em "Adicionar" para começar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className={thCls}>Ativo/Fundo</th>
                    <th className={thCls}>Segmento</th>
                    <th className={thCls}>Vencimento</th>
                    <th className={cn(thCls, "text-right")}>Posição R$</th>
                    <th className={cn(thCls, "text-right")}>% Cart.</th>
                    <th className={cn(thCls, "w-8")}></th>
                  </tr>
                </thead>
                <tbody>
                  {ativos.map((a) => (
                    <tr key={a.id} className="border-t border-border/40">
                      <td className={tdCls}>
                        <Input
                          value={a.nome}
                          onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                          placeholder="Nome do ativo"
                          className="h-7 text-xs min-w-[140px]"
                          disabled={disabled}
                        />
                      </td>
                      <td className={tdCls}>
                        <SegmentoSelect
                          cardId={card.id}
                          value={a.segmento}
                          onChange={(v) => updateAtivo(a.id, { segmento: v })}
                          disabled={disabled}
                        />
                      </td>
                      <td className={tdCls}>
                        <Input
                          value={a.vencimento ?? ""}
                          onChange={(e) => updateAtivo(a.id, { vencimento: e.target.value })}
                          placeholder="D+1, 15/05/2029"
                          className="h-7 text-xs w-28"
                          disabled={disabled}
                        />
                      </td>
                      <td className={tdCls}>
                        <Input
                          type="number"
                          value={a.posicaoBRL ?? ""}
                          onChange={(e) =>
                            updateAtivo(a.id, { posicaoBRL: parseFloat(e.target.value) || 0 })
                          }
                          className="h-7 text-xs w-32 text-right"
                          disabled={disabled}
                        />
                      </td>
                      <td className={tdCls}>
                        <span className="text-xs text-muted-foreground">
                          {formatPct(a.pctCarteira)}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <button
                          onClick={() => removeAtivo(a.id)}
                          className="text-muted-foreground hover:text-destructive"
                          disabled={disabled}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-t text-xs">
            <span className="text-muted-foreground">
              Subtotal:{" "}
              <span className="font-medium text-foreground">{formatBRL(subtotal)}</span>
              {" "}({formatPct(subtotalPct)})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs mt-2"
            onClick={addAtivo}
            disabled={disabled}
          >
            <Plus className="h-3 w-3 mr-1" /> Adicionar {card.label}
          </Button>
        </div>
      );
    }

    // qtde_cotacao_brl: acoes, fiis, cripto
    if (card.inputTipo === "qtde_cotacao_brl") {
      return (
        <div>
          {ativos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              Nenhum ativo. Clique em "Adicionar" para começar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className={thCls}>Ticker/Nome</th>
                    <th className={cn(thCls, "text-right")}>Cotação R$</th>
                    <th className={cn(thCls, "text-right")}>Quantidade</th>
                    <th className={cn(thCls, "text-right")}>Valor R$</th>
                    <th className={cn(thCls, "text-right")}>% Cart.</th>
                    <th className={cn(thCls, "w-8")}></th>
                  </tr>
                </thead>
                <tbody>
                  {ativos.map((a) => (
                    <tr key={a.id} className="border-t border-border/40">
                      <td className={tdCls}>
                        <Input
                          value={a.nome}
                          onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                          placeholder="Nome do ativo"
                          className="h-7 text-xs min-w-[140px]"
                          disabled={disabled}
                        />
                      </td>
                      <td className={tdCls}>
                        <Input
                          type="number"
                          value={a.cotacaoBRL ?? ""}
                          onChange={(e) =>
                            updateAtivo(a.id, { cotacaoBRL: parseFloat(e.target.value) || 0 })
                          }
                          className="h-7 text-xs w-28 text-right"
                          disabled={disabled}
                        />
                      </td>
                      <td className={tdCls}>
                        <Input
                          type="number"
                          value={a.quantidade ?? ""}
                          onChange={(e) =>
                            updateAtivo(a.id, { quantidade: parseFloat(e.target.value) || 0 })
                          }
                          className="h-7 text-xs w-24 text-right"
                          disabled={disabled}
                        />
                      </td>
                      <td className={tdCls}>
                        <span className="text-xs text-right text-muted-foreground whitespace-nowrap block">
                          {formatBRL(a.valorBRL)}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <span className="text-xs text-muted-foreground">
                          {formatPct(a.pctCarteira)}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <button
                          onClick={() => removeAtivo(a.id)}
                          className="text-muted-foreground hover:text-destructive"
                          disabled={disabled}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-t text-xs">
            <span className="text-muted-foreground">
              Subtotal:{" "}
              <span className="font-medium text-foreground">{formatBRL(subtotal)}</span>
              {" "}({formatPct(subtotalPct)})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs mt-2"
            onClick={addAtivo}
            disabled={disabled}
          >
            <Plus className="h-3 w-3 mr-1" /> Adicionar {card.label}
          </Button>
        </div>
      );
    }

    // qtde_cotacao_usd: exterior
    return (
      <div>
        {ativos.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Nenhum ativo. Clique em "Adicionar" para começar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className={thCls}>Ticker/Nome</th>
                  <th className={thCls}>Segmento</th>
                  <th className={cn(thCls, "text-right")}>Cotação USD</th>
                  <th className={cn(thCls, "text-right")}>Quantidade</th>
                  <th className={cn(thCls, "text-right")}>Valor R$</th>
                  <th className={cn(thCls, "text-right")}>% Cart.</th>
                  <th className={cn(thCls, "w-8")}></th>
                </tr>
              </thead>
              <tbody>
                {ativos.map((a) => (
                  <tr key={a.id} className="border-t border-border/40">
                    <td className={tdCls}>
                      <Input
                        value={a.nome}
                        onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                        placeholder="Nome do ativo"
                        className="h-7 text-xs min-w-[140px]"
                        disabled={disabled}
                      />
                    </td>
                    <td className={tdCls}>
                      <SegmentoSelect
                        cardId={card.id}
                        value={a.segmento}
                        onChange={(v) => updateAtivo(a.id, { segmento: v })}
                        disabled={disabled}
                      />
                    </td>
                    <td className={tdCls}>
                      <Input
                        type="number"
                        value={a.cotacaoUSD ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { cotacaoUSD: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-28 text-right"
                        disabled={disabled}
                      />
                    </td>
                    <td className={tdCls}>
                      <Input
                        type="number"
                        value={a.quantidade ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { quantidade: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-24 text-right"
                        disabled={disabled}
                      />
                    </td>
                    <td className={tdCls}>
                      <span className="text-xs text-right text-muted-foreground whitespace-nowrap block">
                        {formatBRL(a.valorBRL)}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className="text-xs text-muted-foreground">
                        {formatPct(a.pctCarteira)}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <button
                        onClick={() => removeAtivo(a.id)}
                        className="text-muted-foreground hover:text-destructive"
                        disabled={disabled}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-t text-xs">
          <span className="text-muted-foreground">
            Subtotal:{" "}
            <span className="font-medium text-foreground">{formatBRL(subtotal)}</span>
            {" "}({formatPct(subtotalPct)})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs mt-2"
          onClick={addAtivo}
          disabled={disabled}
        >
          <Plus className="h-3 w-3 mr-1" /> Adicionar {card.label}
        </Button>
      </div>
    );
  }

  // ── MODO RECOMENDADA ────────────────────────────────────────────────────────

  return (
    <div>
      {ativos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          Nenhum ativo. Clique em "Adicionar" para começar.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className={thCls}>Ativo/Fundo</th>
                <th className={thCls}>Segmento</th>
                <th className={cn(thCls, "text-right")}>% Meta</th>
                <th className={cn(thCls, "text-right")}>R$ Meta</th>
                <th className={cn(thCls, "text-right")}>% Atual (ref)</th>
                <th className={cn(thCls, "text-right")}>Dif. R$</th>
                <th className={cn(thCls, "w-8")}></th>
              </tr>
            </thead>
            <tbody>
              {ativos.map((a) => {
                const ref = ativosAtuaisRef.find(
                  (r) => r.nome.trim().toLowerCase() === a.nome.trim().toLowerCase()
                );
                const pctAtual = ref?.pctCarteira ?? null;
                const valorAtualBRL = ref?.valorBRL ?? 0;
                const dif = (a.valorMetaBRL ?? 0) - valorAtualBRL;
                return (
                  <tr key={a.id} className="border-t border-border/40">
                    <td className={tdCls}>
                      <Input
                        value={a.nome}
                        onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                        placeholder="Nome do ativo"
                        className="h-7 text-xs min-w-[140px]"
                        disabled={disabled}
                      />
                    </td>
                    <td className={tdCls}>
                      <SegmentoSelect
                        cardId={card.id}
                        value={a.segmento}
                        onChange={(v) => updateAtivo(a.id, { segmento: v })}
                        disabled={disabled}
                      />
                    </td>
                    <td className={tdCls}>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={a.pctMeta ?? ""}
                        onChange={(e) => {
                          const newPct = parseFloat(e.target.value) || 0;
                          updateAtivo(a.id, {
                            pctMeta: newPct,
                            valorMetaBRL: (newPct / 100) * patrimonio,
                          });
                        }}
                        className="h-7 text-xs w-20 text-right"
                        disabled={disabled}
                      />
                    </td>
                    <td className={tdCls}>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatBRL(a.valorMetaBRL ?? 0)}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {pctAtual !== null ? formatPct(pctAtual) : "—"}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span
                        className={cn(
                          "text-xs font-medium whitespace-nowrap",
                          dif > 100
                            ? "text-green-600"
                            : dif < -100
                            ? "text-red-600"
                            : "text-muted-foreground"
                        )}
                      >
                        {Math.abs(dif) <= 100
                          ? "—"
                          : `${dif > 0 ? "+" : ""}${formatBRL(dif)}`}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <button
                        onClick={() => removeAtivo(a.id)}
                        className="text-muted-foreground hover:text-destructive"
                        disabled={disabled}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-t text-xs">
        <span className="text-muted-foreground">
          Subtotal:{" "}
          <span className="font-medium text-foreground">{formatBRL(subtotal)}</span>
          {" "}({formatPct(subtotalPct)})
        </span>
        <span className="text-muted-foreground">
          Meta: <span className="font-medium">{formatPct(totalPctMeta)}</span>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs mt-2"
        onClick={addAtivo}
        disabled={disabled}
      >
        <Plus className="h-3 w-3 mr-1" /> Adicionar {card.label}
      </Button>
    </div>
  );
}
