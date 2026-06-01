export function gerarPDF(nomeCliente: string) {
  const titulo = document.title;
  const data = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  document.title = `Estrategia_Inicial_${nomeCliente}_${data}`;

  const container = document.querySelector(".doc-pages-container");
  if (container) container.classList.add("print-all");

  window.print();

  document.title = titulo;
  if (container) container.classList.remove("print-all");
}
