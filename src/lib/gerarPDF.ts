export function gerarPDF(nomeCliente: string) {
  const titulo = document.title;
  const data = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  const nomeLimpo = nomeCliente.trim().replace(/\s+/g, "_");
  document.title = `Estrategia_Inicial_${nomeLimpo}_${data}`;

  window.print();

  document.title = titulo;
}
