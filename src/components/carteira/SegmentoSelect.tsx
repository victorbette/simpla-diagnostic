import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SimplaCardId } from "@/lib/carteira/segmentos";
import { getCard, cardTemSegmentos } from "@/lib/carteira/segmentos";

interface Props {
  cardId: SimplaCardId;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function SegmentoSelect({ cardId, value, onChange, disabled = false }: Props) {
  const [open, setOpen] = useState(false);

  if (!cardTemSegmentos(cardId)) return null;

  const card = getCard(cardId);
  const cor = card.cor;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-default disabled:opacity-60"
          style={{
            backgroundColor: `${cor}18`,
            borderColor: `${cor}4d`,
            color: cor,
          }}
        >
          <span>{value || card.segmentoPadrao}</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        {card.segmentos.map((seg) => (
          <DropdownMenuItem
            key={seg}
            onSelect={() => { onChange(seg); setOpen(false); }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full shrink-0"
              style={{ backgroundColor: value === seg ? cor : "transparent" }}
            >
              {value === seg && <Check className="h-2.5 w-2.5 text-white" />}
            </span>
            <span className={value === seg ? "font-medium" : ""}>{seg}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
