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
 *
 * Por eso hay raíces, pero solo donde la familia entera pertenece al mismo oficio:
 * `instal` (instalar, instale, instalación, instalado), `repara` (reparar, reparación),
 * `arregl`, `limpi`, `pint`, `malogr` y los gentilicios del oficio (`cerrajer`,
 * `gasfiter`, `carpinter`). Sin la raíz, «necesito que alguien la instale» y «necesito
 * una reparación» no coincidían con nada, porque `instalar` y `reparar` no están dentro
 * de esas formas.
 *
 * Y para que una raíz no se cuele dentro de otra palabra, cada término se busca **al
 * comienzo de una palabra**, no en cualquier posición: `repara` encuentra «reparación»
 * pero no «preparar». Es una sola regla para toda la tabla, en vez de una lista de
 * excepciones que habría que ir ampliando.
 */
const PALABRAS: readonly { id: Trade; words: readonly string[] }[] = [
  { id: 'Cerrajería', words: ['chapa', 'cerradura', 'llave', 'candado', 'cerrajer', 'se traba', 'trabada'] },
  { id: 'Electricidad', words: ['luz', 'luces', 'electric', 'enchufe', 'foco', 'bombilla', 'tomacorriente', 'interruptor', 'apagador', 'timbre', 'cortocircuito', 'corto circuito', 'cable'] },
  { id: 'Gasfitería', words: ['tuberia', 'caneria', 'gasfiter', 'fuga', 'grifo', 'desague', 'inodoro', 'lavatorio', 'ducha', 'gotea'] },
  { id: 'Pintura', words: ['pint', 'barniz', 'esmalte'] },
  { id: 'Carpintería', words: ['mueble', 'madera', 'closet', 'cajon', 'carpinter'] },
  { id: 'Instalaciones', words: ['instal', 'repisa', 'colgar', 'montar', 'empotrar'] },
  { id: 'Limpieza', words: ['limpi', 'sucio', 'suciedad', 'mancha', 'polvo'] },
  { id: 'Reparaciones', words: ['repara', 'arregl', 'roto', 'rota', 'malogr', 'no funciona'] },
];

/**
 * Cada término, compilado una vez y anclado al inicio de palabra. El texto ya llega
 * normalizado a minúsculas sin tildes, así que `` de ASCII basta como frontera.
 */
const REGLAS = PALABRAS.map(({ id, words }) => ({
  id,
  patrones: words.map(word => new RegExp(`\\b${word}`)),
}));

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
  for (const { id, patrones } of REGLAS) {
    const aciertos = patrones.filter(patron => patron.test(texto)).length;
    if (aciertos > 0 && (!mejor || aciertos > mejor.aciertos)) mejor = { id, aciertos };
  }
  return mejor && TRADES.includes(mejor.id) ? mejor.id : null;
}
