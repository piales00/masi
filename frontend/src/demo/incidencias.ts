/**
 * Lo que la persona escribe al reportar un problema.
 *
 * Importante: esto **no viaja a la cadena**. Ni `dispute` ni el `Job` del contrato
 * tienen dónde guardar un texto, así que aquí solo queda como contexto local de la
 * demo, igual que el texto de las reseñas hasta F5. Cuando exista el almacén
 * compartido, este módulo se reemplaza por esa llamada y las pantallas no cambian.
 */
const KEY = 'masi.demo.incidencias.v1';

export interface Incidencia {
  jobId: string;
  /** 'client' o 'provider': quién lo reportó. */
  reportadaPor: string;
  motivo: string;
  creadaEn: string;
}

function leerTodas(): Incidencia[] {
  try {
    const raw = localStorage.getItem(KEY);
    const value = raw ? JSON.parse(raw) : null;
    return Array.isArray(value) ? value as Incidencia[] : [];
  } catch {
    return [];
  }
}

export function leerIncidencia(jobId: string): Incidencia | null {
  return leerTodas().find(item => item.jobId === jobId) ?? null;
}

/** Se guarda antes de firmar: si la firma falla, queda un texto sin efecto, no al revés. */
export function guardarIncidencia(incidencia: Incidencia): void {
  try {
    const otras = leerTodas().filter(item => item.jobId !== incidencia.jobId);
    localStorage.setItem(KEY, JSON.stringify([incidencia, ...otras]));
  } catch {
    // Sin almacenamiento el reporte sigue su curso; solo no se recuerda el texto.
  }
}
