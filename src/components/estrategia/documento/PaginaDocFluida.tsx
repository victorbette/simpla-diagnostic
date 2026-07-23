import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { DOC } from "@/lib/documentoStyles";
import { empacotarPorAltura, orcamentoPagina, type ItemPaginavel } from "@/lib/paginacaoDoc";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";

/** Bloco indivisível de conteúdo de uma seção do documento */
export interface BlocoDoc {
  chave: string;
  node: ReactNode;
  /** Bloco que não pode fechar uma página (ex.: rótulo de subseção) */
  grudaNoProximo?: boolean;
}

interface Props {
  titulo: string;
  nomeCliente: string;
  blocos: BlocoDoc[];
}

/* Réplica do miolo do PaginaDoc: 210mm menos 2×16mm de padding lateral,
 * flex column (margens não colapsam — igual à página real). */
const ESTILO_COLUNA: CSSProperties = {
  width: "178mm",
  display: "flex",
  flexDirection: "column",
  fontFamily: DOC.fonte,
  position: "relative",
};

/**
 * Seção do documento com paginação automática por medição real: os blocos são
 * renderizados num medidor oculto que reproduz o layout de impressão, a altura
 * de cada um é medida no DOM e eles fluem por quantas folhas A4 forem
 * necessárias — em vez de estourar a página única e sair cortado no PDF.
 *
 * A paginação usa as alturas de impressão (onde a folha é travada em 297mm e
 * o excesso é cortado). Na tela a página só tem minHeight 297mm e cresce com
 * o conteúdo, então não corta — daí bastar medir o modo impressão.
 */
export function PaginaDocFluida({ titulo, nomeCliente, blocos }: Props) {
  const medidorPrintRef = useRef<HTMLDivElement>(null);
  const [paginas, setPaginas] = useState<number[][]>([blocos.map((_, i) => i)]);

  useLayoutEffect(() => {
    const medir = () => {
      const print = medidorPrintRef.current;
      if (!print) return;
      const wPrint = Array.from(print.children) as HTMLElement[];
      if (wPrint.length !== blocos.length) return;

      const itens: ItemPaginavel<number>[] = blocos.map((b, i) => ({
        item: i,
        altura: wPrint[i].offsetHeight,
        grudaNoProximo: b.grudaNoProximo,
      }));
      const novas = empacotarPorAltura(itens, [orcamentoPagina(false), orcamentoPagina(true)])
        .map((pagina) => pagina.map(({ item }) => item));
      setPaginas((prev) => (JSON.stringify(prev) === JSON.stringify(novas) ? prev : novas));
    };

    medir();
    const print = medidorPrintRef.current;
    if (!print) return;
    const ro = new ResizeObserver(medir);
    for (const wrapper of Array.from(print.children)) ro.observe(wrapper);
    return () => ro.disconnect();
  });

  return (
    <>
      {/* Medidor oculto no layout de impressão — cada bloco num wrapper próprio
          (flow-root contém as margens, então offsetHeight = altura real ocupada) */}
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
        <PaginaDoc key={p} rodape={<RodapePagina nomeCliente={nomeCliente} />}>
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
