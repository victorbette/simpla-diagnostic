import { useEffect, useRef, useCallback } from "react";

export function useFerramentaStorage<T>(
  chave: string,
  estado: T,
  setEstado: (v: T) => void,
  inicial: T,
) {
  const primeiroMount = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Carregar ao montar
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(chave);
      if (salvo) {
        const parsed = JSON.parse(salvo) as Partial<T>;
        setEstado({ ...inicial, ...parsed });
      }
    } catch { /**/ }
    primeiroMount.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  // Salvar com debounce sempre que estado mudar
  useEffect(() => {
    if (primeiroMount.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try { localStorage.setItem(chave, JSON.stringify(estado)); } catch { /**/ }
    }, 800);
    return () => clearTimeout(debounceRef.current);
  }, [chave, estado]);

  // Limpar dados
  const limpar = useCallback(() => {
    localStorage.removeItem(chave);
    setEstado(inicial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return { limpar };
}
