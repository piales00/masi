import { TRADES } from './marketplace';
import type { Trade } from './marketplace';

/**
 * A qué servicio se parece lo que la persona escribió.
 *
 * Es una tabla de palabras, no un modelo: se compara el texto contra una lista cerrada y
 * gana el oficio con más coincidencias. Sin IA, sin dependencias y determinista, que es
 * justo lo que hace falta para poder responder siempre lo mismo ante el mismo texto.
 *
 * El texto se normaliza antes de comparar —minúsculas y sin tildes—, así que «MI FOCO SE
 * QUEMÓ», «Se quemó mi foco» y «se quemo mi foco» se evalúan igual. La puntuación no
 * estorba porque se busca la palabra dentro del texto, no una igualdad exacta.
 *
 * Y justo por eso cada término tiene que ser inequívoco **como subcadena**: `traba` vivía
 * dentro de «trabajo», `corto` dentro de «quedó corto» y `cano` dentro de «cercano». Al
 * añadir una palabra aquí, la pregunta no es si significa ese oficio, sino si puede
 * aparecer dentro de otra que no.
 */
const PALABRAS: readonly { id: Trade; words: readonly string[] }[] = [
  { id: 'Cerrajería', words: ['chapa', 'cerradura', 'llave', 'candado', 'se traba', 'trabada'] },
  { id: 'Electricidad', words: ['luz', 'electric', 'enchufe', 'foco', 'bombilla', 'tomacorriente', 'interruptor', 'apagador', 'cortocircuito', 'corto circuito', 'cableado'] },
  { id: 'Gasfitería', words: ['tuberia', 'caneria', 'fuga', 'grifo', 'desague', 'inodoro', 'gotea'] },
  { id: 'Pintura', words: ['pintar', 'pintura', 'pintor', 'barniz'] },
  { id: 'Carpintería', words: ['mueble', 'madera', 'closet', 'puerta de madera', 'cajon'] },
  { id: 'Instalaciones', words: ['instalar', 'repisa', 'colgar', 'montar'] },
  { id: 'Limpieza', words: ['limpiar', 'limpieza', 'sucio', 'mancha'] },
  { id: 'Reparaciones', words: ['reparar', 'arreglar', 'roto'] },
];

/** Minúsculas y sin tildes: `̀-ͯ` es el bloque de marcas que deja NFD. */
export const normalizar = (texto: string): string =>
  texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * El oficio que mejor encaja con la descripción, o `null` si no hay ninguna pista. Nunca
 * devuelve un rubro fuera de las ocho categorías del catálogo.
 */
export function sugerirServicio(descripcion: string): Trade | null {
  const texto = normalizar(descripcion);
  if (texto.trim().length < 3) return null;
  let mejor: { id: Trade; aciertos: number } | null = null;
  for (const { id, words } of PALABRAS) {
    const aciertos = words.filter(word => texto.includes(word)).length;
    if (aciertos > 0 && (!mejor || aciertos > mejor.aciertos)) mejor = { id, aciertos };
  }
  return mejor && TRADES.includes(mejor.id) ? mejor.id : null;
}
