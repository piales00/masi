import type { Cotizacion, CotizacionInput, CotizacionPatch, Resena, ResenaInput } from '../../../shared/api';
import { api } from '../api/client';
import type { Postulacion, Solicitud } from './DemoContext';

/**
 * De dónde salen y a dónde van solicitudes, postulaciones, cotizaciones y reseñas.
 *
 * `local` es el comportamiento de siempre: todo en este navegador, que es el plan B para
 * grabar con un solo dispositivo. `api` habla con el almacén compartido, que es lo que
 * permite que María publique en su teléfono y Juan lo vea en el suyo.
 *
 * Se elige con `VITE_STORE=api`; sin variable, `local`. Una sola costura: nadie más en
 * la app decide dónde se guardan las cosas.
 */
export type ModoAlmacen = 'local' | 'api';

export const MODO: ModoAlmacen = import.meta.env.VITE_STORE === 'api' ? 'api' : 'local';

export interface Datos {
  solicitudes: Solicitud[];
  postulaciones: Postulacion[];
  cotizaciones: Cotizacion[];
}

export interface DemoStore {
  readonly remoto: boolean;
  /** Relee todo lo compartido. En local no hay nada que traer: devuelve null. */
  cargar(): Promise<Datos | null>;
  crearSolicitud(solicitud: Solicitud): Promise<Solicitud>;
  crearPostulacion(postulacion: Postulacion): Promise<Postulacion>;
  elegir(solicitudId: string, postulacionId: string): Promise<void>;
  crearCotizacion(cotizacion: Cotizacion): Promise<Cotizacion>;
  patchCotizacion(id: string, patch: CotizacionPatch): Promise<Cotizacion>;
  leerResena(jobId: string): Promise<Resena | null>;
  /** Las reseñas que ha recibido un profesional, de la más reciente a la más antigua. */
  leerResenasDe(profesional: { providerId?: string; providerAddress?: string | null }): Promise<Resena[]>;
  guardarResena(jobId: string, input: ResenaInput): Promise<Resena>;
}

const RESENAS_KEY = 'masi.demo.resenas.v1';

function leerResenasLocales(): Resena[] {
  try {
    const raw = localStorage.getItem(RESENAS_KEY);
    const value = raw ? JSON.parse(raw) : null;
    return Array.isArray(value) ? value as Resena[] : [];
  } catch {
    return [];
  }
}

/**
 * Todo se guarda en este navegador. Las escrituras de solicitudes, postulaciones y
 * cotizaciones las sigue haciendo DemoContext sobre localStorage, así que aquí solo se
 * devuelve lo recibido: el almacén local no transforma nada.
 */
const localStore: DemoStore = {
  remoto: false,
  async cargar() { return null; },
  async crearSolicitud(solicitud) { return solicitud; },
  async crearPostulacion(postulacion) { return postulacion; },
  async elegir() { /* El estado lo escribe DemoContext. */ },
  async crearCotizacion(cotizacion) { return cotizacion; },
  async patchCotizacion(id) {
    throw new Error(`patchCotizacion local no aplica: ${id}`);
  },
  async leerResena(jobId) {
    return leerResenasLocales().find(item => item.jobId === jobId) ?? null;
  },
  async leerResenasDe({ providerId, providerAddress }) {
    // Sin ningún criterio no se devuelve todo: sería la reseña de cualquiera.
    if (!providerId && !providerAddress) return [];
    return leerResenasLocales().filter(item =>
      (providerId ? item.providerId === providerId : false)
      || (providerAddress ? item.providerAddress === providerAddress : false));
  },
  async guardarResena(jobId, input) {
    const item: Resena = { ...input, jobId, creadaEn: new Date().toISOString() };
    try {
      const otras = leerResenasLocales().filter(row => row.jobId !== jobId);
      localStorage.setItem(RESENAS_KEY, JSON.stringify([item, ...otras]));
    } catch {
      // Sin almacenamiento la reseña no sobrevive a la recarga; la calificación sí.
    }
    return item;
  },
};

/**
 * El contrato del almacén no tiene dónde poner las fotos ni la urgencia: `fotos` es un
 * número y `cuando` no existe. Se envía lo que el contrato admite y lo demás se queda
 * en este dispositivo; está explicado en el reporte de F5.
 */
const FOTOS_KEY = 'masi.demo.fotosLocales.v1';

type Extra = { fotos: string[]; cuando: string };

function leerExtras(): Record<string, Extra> {
  try {
    const raw = localStorage.getItem(FOTOS_KEY);
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value === 'object' ? value as Record<string, Extra> : {};
  } catch {
    return {};
  }
}

function guardarExtra(id: string, extra: Extra): void {
  try {
    localStorage.setItem(FOTOS_KEY, JSON.stringify({ ...leerExtras(), [id]: extra }));
  } catch {
    // Sin almacenamiento se pierden las fotos al recargar; la solicitud sigue viva.
  }
}

/** Del contrato compartido al modelo de la app, recuperando lo que solo vive aquí. */
function aSolicitudLocal(remota: Awaited<ReturnType<typeof api.getSolicitud>>): Solicitud {
  const extra = leerExtras()[remota.id];
  return {
    id: remota.id,
    servicio: remota.servicio,
    descripcion: remota.descripcion,
    fotos: extra?.fotos ?? [],
    ubicacion: remota.ubicacion,
    distrito: remota.distrito,
    cuando: extra?.cuando ?? '',
    cliente: remota.cliente,
    clienteId: remota.clienteId,
    estado: remota.estado,
    postulacionElegidaId: remota.postulacionElegidaId ?? undefined,
    creadaEn: remota.creadaEn,
  };
}

const apiStore: DemoStore = {
  remoto: true,

  async cargar() {
    const [solicitudes, postulaciones, cotizaciones] = await Promise.all([
      api.listSolicitudes(),
      api.listPostulaciones(),
      api.listCotizaciones(),
    ]);
    return {
      solicitudes: solicitudes.map(aSolicitudLocal),
      // `providerPerfil` no existe en el contrato: la ficha se resuelve por providerId.
      postulaciones: postulaciones.map(item => ({ ...item })),
      cotizaciones,
    };
  },

  async crearSolicitud(solicitud) {
    const creada = await api.createSolicitud({
      clienteId: solicitud.clienteId,
      servicio: solicitud.servicio,
      descripcion: solicitud.descripcion,
      fotos: solicitud.fotos.length,
      ubicacion: solicitud.ubicacion,
      distrito: solicitud.distrito,
      cliente: solicitud.cliente,
    });
    guardarExtra(creada.id, { fotos: solicitud.fotos, cuando: solicitud.cuando });
    return aSolicitudLocal(creada);
  },

  async crearPostulacion(postulacion) {
    const creada = await api.createPostulacion({
      solicitudId: postulacion.solicitudId,
      providerId: postulacion.providerId,
      providerNombre: postulacion.providerNombre,
      providerAddress: postulacion.providerAddress,
      precio: postulacion.precio,
      minutos: postulacion.minutos,
    });
    return { ...creada, providerPerfil: postulacion.providerPerfil };
  },

  async elegir(solicitudId, postulacionId) {
    await api.elegir(solicitudId, postulacionId);
  },

  async crearCotizacion(cotizacion) {
    const input: CotizacionInput = {
      solicitudId: cotizacion.solicitudId,
      postulacionId: cotizacion.postulacionId,
      providerId: cotizacion.providerId,
      providerAddress: cotizacion.providerAddress,
      clienteId: cotizacion.clienteId,
      totalStroops: cotizacion.totalStroops,
      materialesStroops: cotizacion.materialesStroops,
      materialsBps: cotizacion.materialsBps,
      feeBps: cotizacion.feeBps,
      reviewSecs: cotizacion.reviewSecs,
      descripcion: cotizacion.descripcion,
    };
    return await api.createCotizacion(input);
  },

  patchCotizacion(id: string, patch: CotizacionPatch): Promise<Cotizacion> {
    return api.patchCotizacion(id, patch);
  },

  leerResena(jobId: string) {
    return api.getResena(jobId);
  },

  async leerResenasDe({ providerId, providerAddress }) {
    if (!providerId && !providerAddress) return [];
    // Una sola consulta por criterio: el endpoint los combina con Y, no con O.
    const listas = await Promise.all([
      providerId ? api.listResenas({ providerId }) : Promise.resolve([]),
      providerAddress ? api.listResenas({ providerAddress }) : Promise.resolve([]),
    ]);
    const porTrabajo = new Map(listas.flat().map(item => [item.jobId, item]));
    return [...porTrabajo.values()];
  },

  guardarResena(jobId: string, input: ResenaInput) {
    return api.putResena(jobId, input);
  },
};

export const store: DemoStore = MODO === 'api' ? apiStore : localStore;
