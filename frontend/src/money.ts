import { MAX_MATERIALS_BPS } from './config';

/** El token usa 7 decimales. Nada de esto pasa por `number`. */
const SCALE = 10_000_000n;
const BPS = 10_000n;

/** Acepta "1200" o "1200.5", con dos decimales como máximo. */
export function solesToStroops(input: string): bigint {
  const text = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error(`Monto inválido: ${input}`);
  const [entero, decimales = ''] = text.split('.');
  const centavos = BigInt(entero) * 100n + BigInt(decimales.padEnd(2, '0') || '0');
  return centavos * (SCALE / 100n);
}

/** Mismo formato que formatPrice de marketplace.ts: "S/ 1,200". */
export function formatSoles(stroops: bigint): string {
  const negativo = stroops < 0n;
  const abs = negativo ? -stroops : stroops;
  const soles = Number(abs / SCALE) + Number((abs % SCALE) / (SCALE / 100n)) / 100;
  return `${negativo ? '-' : ''}S/ ${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(soles)}`;
}

/** La misma fórmula que el contrato, para que no haya un sol de diferencia. */
export function portion(amount: bigint, bps: number): bigint {
  const puntos = BigInt(bps);
  return (amount / BPS) * puntos + ((amount % BPS) * puntos) / BPS;
}

/** Proporción de materiales sobre el total, recortada al tope del contrato. */
export function materialsBpsOf(total: bigint, materiales: bigint): number {
  if (total <= 0n) return 0;
  const bps = (materiales * BPS) / total;
  const tope = BigInt(MAX_MATERIALS_BPS);
  return Number(bps > tope ? tope : bps);
}
