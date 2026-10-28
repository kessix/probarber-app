/** "45,50" ou "45.5" -> 4550 centavos. Devolve null se não for um valor válido. */
export function parseReais(text: string): number | null {
  const clean = text.trim().replace(/\s/g, '').replace('R$', '');
  if (!/^\d+([.,]\d{0,2})?$/.test(clean)) return null;
  const [whole, cents = ''] = clean.replace(',', '.').split('.');
  return Number(whole) * 100 + Number(cents.padEnd(2, '0'));
}

/** 4550 -> "45,50" (para preencher campos). */
export function reaisInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

/** "11912345678" -> "(11) 91234-5678" enquanto digita. */
export function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
