export function gerarPDF(nomeCliente: string, prefixo = "Estrategia_Inicial") {
  const titulo = document.title;
  const data = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  const nomeLimpo = nomeCliente.trim().replace(/\s+/g, "_");
  document.title = `${prefixo}_${nomeLimpo}_${data}`;

  window.print();

  document.title = titulo;
}
