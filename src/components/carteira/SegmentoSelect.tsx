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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          style={{
            backgroundColor: "#DBEAFE",
            color: "#1E40AF",
            border: "0.5px solid #BFDBFE",
            borderRadius: 99,
            padding: "3px 8px",
            fontSize: 11,
            cursor: disabled ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            opacity: disabled ? 0.6 : 1,
            whiteSpace: "nowrap" as const,
            transition: "background-color 150ms",
          }}
          onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.backgroundColor = "#BFDBFE"; }}
          onMouseLeave={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.backgroundColor = "#DBEAFE"; }}
        >
          <span>{value || card.segmentoPadrao}</span>
          <ChevronDown style={{ width: 10, height: 10, opacity: 0.7 }} />
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
              style={{ backgroundColor: value === seg ? "#2563EB" : "transparent" }}
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
