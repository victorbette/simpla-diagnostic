import { useState } from "react";
import { parseBRL, formatInputBRL } from "../lib/tax";

export function useCurrencyInput(initial = 0) {
  const [value, setValue] = useState(initial);
  const [display, setDisplay] = useState(
    initial > 0 ? formatInputBRL(initial) : ""
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplay(e.target.value);
    setValue(parseBRL(e.target.value));
  };

  const onBlur = () => {
    setDisplay(value > 0 ? formatInputBRL(value) : "");
  };

  const set = (v: number) => {
    setValue(v);
    setDisplay(v > 0 ? formatInputBRL(v) : "");
  };

  return { value, display, onChange, onBlur, set };
}
