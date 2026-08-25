export function calcularIdade(dataNasc: string | undefined): number {
  if (!dataNasc) return 0;

  let dt: Date | null = null;

  // dd/MM/yyyy
  const dmyMatch = dataNasc.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    dt = new Date(Number(y), Number(m) - 1, Number(d));
  }

  // ISO yyyy-MM-dd (e qualquer formato que Date entenda)
  if (!dt) {
    const iso = new Date(dataNasc);
    if (!isNaN(iso.getTime())) dt = iso;
  }

  if (!dt || isNaN(dt.getTime())) return 0;

  return Math.floor((Date.now() - dt.getTime()) / (365.25 * 24 * 3600 * 1000));
}
