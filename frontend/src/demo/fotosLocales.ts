/**
 * Las imágenes de una solicitud cuando no hay almacén compartido (`VITE_STORE=local`).
 *
 * Viven en su propia clave, una lista por solicitud, y no dentro del registro de la
 * solicitud: el listado se relee entero a cada rato y arrastrar megas de data URL en cada
 * lectura era justo lo que había que evitar. En modo API esto no se usa; allí las fotos
 * las guarda el servidor y se piden por su endpoint.
 */
const KEY = 'masi.demo.fotos.v2';

type Album = Record<string, string[]>;

function leerAlbum(): Album {
  try {
    const raw = localStorage.getItem(KEY);
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value === 'object' ? value as Album : {};
  } catch {
    return {};
  }
}

export function leerFotosLocales(solicitudId: string): string[] {
  const fotos = leerAlbum()[solicitudId];
  return Array.isArray(fotos) ? fotos.filter(foto => typeof foto === 'string') : [];
}

export function guardarFotosLocales(solicitudId: string, fotos: string[]): void {
  if (fotos.length === 0) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...leerAlbum(), [solicitudId]: fotos }));
  } catch {
    // Sin cuota las fotos no sobreviven a la recarga; la solicitud sí, y eso es lo que importa.
  }
}
