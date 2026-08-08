export function gerarPDF(nomeCliente: string, prefixo = "Financial_Planning") {
  const nomeLimpo = nomeCliente
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  const hoje = new Date();
  const d = String(hoje.getDate()).padStart(2, "0");
  const m = String(hoje.getMonth() + 1).padStart(2, "0");
  const a = hoje.getFullYear();

  const titulo = document.title;
  document.title = `${prefixo}_${nomeLimpo}_${d}_${m}_${a}`;

  window.print();

  setTimeout(() => {
    document.title = titulo;
  }, 1000);
}
