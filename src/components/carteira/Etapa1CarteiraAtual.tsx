import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_ORDER } from "@/lib/carteira/types";
import { CarteiraCard, makeNovoAtivo } from "./CarteiraCard";
import { ImportarIA } from "./ImportarIA";

interface Props {
  ativos: Ativo[];
  onAtivos: (ativos: Ativo[]) => void;
  patrimonio: number;
}

export function Etapa1CarteiraAtual({ ativos, onAtivos, patrimonio }: Props) {
  function handleAdd(cardId: CardId) {
    onAtivos([...ativos, makeNovoAtivo(cardId)]);
  }

  function handleRemove(id: string) {
    onAtivos(ativos.filter((a) => a.id !== id));
  }

  function handleChange(id: string, campo: keyof Ativo, valor: string | number) {
    onAtivos(ativos.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
  }

  function handleIA(novos: Ativo[]) {
    onAtivos([...ativos, ...novos]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 800 }}>
      <ImportarIA onConfirmar={handleIA} modo="atual" />

      {CARD_ORDER.map((cardId) => (
        <CarteiraCard
          key={cardId}
          cardId={cardId}
          ativos={ativos.filter((a) => a.card === cardId)}
          modo="atual"
          patrimonio={patrimonio}
          onAdd={() => handleAdd(cardId)}
          onRemove={handleRemove}
          onChange={handleChange}
        />
      ))}
    </div>
  );
}
