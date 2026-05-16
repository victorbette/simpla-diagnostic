import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

function formatDisplay(value: number): string {
  if (value === 0) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parseCurrencyInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

export function CurrencyInput({
  value,
  onChange,
  className,
  placeholder = "R$ 0,00",
  disabled,
  id,
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = focused
    ? value === 0
      ? ""
      : formatDisplay(value)
    : value === 0
    ? ""
    : formatDisplay(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const parsed = parseCurrencyInput(e.target.value);
    onChange(parsed);
  }

  function handleFocus() {
    setFocused(true);
  }

  function handleBlur() {
    setFocused(false);
  }

  return (
    <Input
      id={id}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={displayValue}
      placeholder={placeholder}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      className={cn("text-right tabular-nums", className)}
    />
  );
}
