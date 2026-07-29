import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { DOC } from "@/lib/documentoStyles";
import { empacotarPorAltura, orcamentoPagina, type ItemPaginavel } from "@/lib/paginacaoDoc";
import { PaginaDoc } from "@/components/estrategia/documento/PaginaDoc";
import { HeaderSecao } from "@/components/estrategia/documento/HeaderSecao";
import { RodapePaginaDiag } from "./RodapePaginaDiag";

export interface BlocoDoc {
  chave: string;
  node: ReactNode;
  grudaNoProximo?: boolean;
}

interface Props {
  titulo: string;
  nomeCliente: string;
  blocos: BlocoDoc[];
}

const ESTILO_COLUNA: CSSProperties = {
  width: "178mm",
  display: "flex",
  flexDirection: "column",
  fontFamily: DOC.fonte,
  position: "relative",
};

export function PaginaDocFluidaDiag({ titulo, nomeCliente, blocos }: Props) {
  const medidorPrintRef = useRef<HTMLDivElement>(null);
  const [paginas, setPaginas] = useState<number[][]>([blocos.map((_, i) => i)]);

  useLayoutEffect(() => {
    let pausado = false;

    const medir = () => {
      if (pausado) return;
      const print = medidorPrintRef.current;
      if (!print) return;
      const wPrint = Array.from(print.children) as HTMLElement[];
      if (wPrint.length !== blocos.length) return;

      const itens: ItemPaginavel<number>[] = blocos.map((b, i) => ({
        item: i,
        altura: wPrint[i].offsetHeight,
        grudaNoProximo: b.grudaNoProximo,
      }));
      const todosZero = itens.every((it) => it.altura === 0);
      if (todosZero) return;

      const novas = empacotarPorAltura(itens, [orcamentoPagina(false), orcamentoPagina(true)])
        .map((pagina) => pagina.map(({ item }) => item));
      setPaginas((prev) => (JSON.stringify(prev) === JSON.stringify(novas) ? prev : novas));
    };

    const onBeforePrint = () => { pausado = true; };
    const onAfterPrint  = () => { pausado = false; };

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint",  onAfterPrint);

    medir();
    const print = medidorPrintRef.current;
    if (!print) return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint",  onAfterPrint);
    };
    const ro = new ResizeObserver(medir);
    for (const wrapper of Array.from(print.children)) ro.observe(wrapper);
    return () => {
      ro.disconnect();
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint",  onAfterPrint);
    };
  });

  return (
    <>
      <div
        className="no-print"
        aria-hidden="true"
        style={{ position: "fixed", left: -21000, top: 0, visibility: "hidden", pointerEvents: "none" }}
      >
        <div ref={medidorPrintRef} className="doc-medida-print" style={ESTILO_COLUNA}>
          {blocos.map((b) => (
            <div key={b.chave} style={{ display: "flow-root" }}>{b.node}</div>
          ))}
        </div>
      </div>

      {paginas.map((indices, p) => (
        <PaginaDoc key={p} rodape={<RodapePaginaDiag nomeCliente={nomeCliente} />}>
          <HeaderSecao titulo={titulo} subtitulo={p > 0 ? "continuação" : undefined} />
          {indices
            .filter((i) => i < blocos.length)
            .map((i) => (
              <Fragment key={blocos[i].chave}>{blocos[i].node}</Fragment>
            ))}
        </PaginaDoc>
      ))}
    </>
  );
}
