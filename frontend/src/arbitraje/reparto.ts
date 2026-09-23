import type { Job } from '../../../shared/escrow';
import { portion } from '../money';

/**
 * El reparto de una disputa, calculado igual que el contrato para que la pantalla
 * enseñe exactamente lo que se va a firmar.
 *
 * Solo se reparte `remaining_amount`. El adelanto de materiales ya se pagó al profesional
 * cuando empezó el trabajo y no vuelve atrás; la comisión de la plataforma sale aparte.
 * El redondeo cae del lado del cliente, porque el contrato calcula la parte del
 * profesional y le da al cliente lo que queda.
 */
export interface Reparto {
  profesional: bigint;
  cliente: bigint;
}

export function repartoDe(saldoEnDisputa: bigint, providerBps: number): Reparto {
  const profesional = portion(saldoEnDisputa, providerBps);
  return { profesional, cliente: saldoEnDisputa - profesional };
}

/** Los estados del contrato llegan como `{ tag }` tras decodificar los bindings. */
export function enDisputa(trabajo: Job): boolean {
  return trabajo.state.tag === 'Disputed';
}

/** Dirección larga para una pantalla estrecha: `CAGC22…2DVL`. */
export function direccionCorta(address: string): string {
  return address.length <= 14 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`;
}
