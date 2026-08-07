import { createContext, useContext, useRef, useCallback, type ReactNode } from 'react';

type SalvarFn = () => Promise<void>;

interface SaveContextType {
  registrarSalvador: (id: string, fn: SalvarFn) => void;
  desregistrarSalvador: (id: string) => void;
  salvarTudo: () => Promise<void>;
}

const SaveContext = createContext<SaveContextType>({
  registrarSalvador: () => {},
  desregistrarSalvador: () => {},
  salvarTudo: async () => {},
});

export function SaveProvider({ children }: { children: ReactNode }) {
  const salvadoresRef = useRef<Map<string, SalvarFn>>(new Map());

  const registrarSalvador = useCallback((id: string, fn: SalvarFn) => {
    salvadoresRef.current.set(id, fn);
  }, []);

  const desregistrarSalvador = useCallback((id: string) => {
    salvadoresRef.current.delete(id);
  }, []);

  const salvarTudo = useCallback(async () => {
    const promises: Promise<void>[] = [];
    salvadoresRef.current.forEach((fn) => {
      promises.push(fn().catch((err) => console.error('Erro ao salvar:', err)));
    });
    await Promise.allSettled(promises);
  }, []);

  return (
    <SaveContext.Provider value={{ registrarSalvador, desregistrarSalvador, salvarTudo }}>
      {children}
    </SaveContext.Provider>
  );
}

export const useSaveContext = () => useContext(SaveContext);
