import { xdr } from '@stellar/stellar-sdk';
import * as modulo from '@stellar/js-xdr';

/**
 * SEP-45 transporta las entradas de autorización como un array XDR de
 * `SorobanAuthorizationEntry` en base64, no como un `ScVec`. El SDK no publica un tipo
 * para ese array, así que se arma aquí con el descriptor de js-xdr.
 *
 * El paquete es un bundle UMD: según quién lo cargue, las clases cuelgan de la raíz o
 * de `default`. Se aceptan las dos formas para no depender del empaquetador.
 */
const XDR = (modulo as unknown as { default?: typeof modulo }).default ?? modulo;
const ARRAY = new XDR.VarArray(xdr.SorobanAuthorizationEntry, 0x7fffffff);

export function decodificarEntradas(base64: string): xdr.SorobanAuthorizationEntry[] {
  return ARRAY.fromXDR(Buffer.from(base64, 'base64')) as xdr.SorobanAuthorizationEntry[];
}

/**
 * `ARRAY.toXDR(…)` se serializaría a sí mismo —es un descriptor de tipo, no un valor—,
 * así que la escritura va por un `XdrWriter` explícito.
 */
export function codificarEntradas(entradas: readonly xdr.SorobanAuthorizationEntry[]): string {
  const writer = new XDR.XdrWriter();
  ARRAY.write([...entradas], writer);
  return writer.finalize().toString('base64');
}
