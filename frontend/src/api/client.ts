import type {
  ApiError,
  Cotizacion,
  CotizacionInput,
  CotizacionPatch,
  DescargoInput,
  Disputa,
  FotosDescargo,
  ParteEnDisputa,
  Postulacion,
  PostulacionInput,
  Resena,
  ResenaInput,
  Solicitud,
  SolicitudInput,
} from '../../../shared/api';

/**
 * Cliente del almacén compartido. Los tipos salen de `shared/api.ts`, que es el contrato
 * con el backend: aquí no se copian ni se reinterpretan.
 *
 * El dinero viaja como string (`totalStroops`), nunca como bigint: `JSON.stringify` no
 * sabe serializarlos y reventaría en silencio.
 */
const BASE = '/api';

/** Error de la API ya traducido; la pantalla nunca ve el cuerpo crudo. */
export class ApiCallError extends Error {
  readonly code: ApiError['error']['code'] | 'RED';

  constructor(code: ApiError['error']['code'] | 'RED', message: string) {
    super(message);
    this.name = 'ApiCallError';
    this.code = code;
  }
}

const GENERICO = 'Algo salió mal. Inténtalo de nuevo.';

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      ...init,
      headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    });
  } catch {
    // Sin red no hay cuerpo que leer: es el caso de la API caída.
    throw new ApiCallError('RED', GENERICO);
  }

  if (!respuesta.ok) {
    let cuerpo: ApiError | null = null;
    try {
      cuerpo = await respuesta.json() as ApiError;
    } catch {
      cuerpo = null;
    }
    throw new ApiCallError(cuerpo?.error?.code ?? 'INTERNAL', cuerpo?.error?.message || GENERICO);
  }

  try {
    return await respuesta.json() as T;
  } catch {
    // Un 200 que no es JSON significa que no contestó la API: el dev server devuelve
    // el index.html del SPA. El usuario no tiene por qué leer un error de parseo.
    throw new ApiCallError('INTERNAL', GENERICO);
  }
}

const query = (params: Record<string, string | undefined>): string => {
  const busqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) if (valor) busqueda.set(clave, valor);
  const texto = busqueda.toString();
  return texto ? `?${texto}` : '';
};

const enviar = (metodo: string, cuerpo: unknown): RequestInit => ({ method: metodo, body: JSON.stringify(cuerpo) });

export const api = {
  async listSolicitudes(filtros: { clienteId?: string; servicio?: string; estado?: string } = {}): Promise<Solicitud[]> {
    const { items } = await pedir<{ items: Solicitud[] }>(`/solicitudes${query(filtros)}`);
    return items;
  },

  createSolicitud(input: SolicitudInput): Promise<Solicitud> {
    return pedir<Solicitud>('/solicitudes', enviar('POST', input));
  },

  getSolicitud(id: string): Promise<Solicitud> {
    return pedir<Solicitud>(`/solicitudes/${encodeURIComponent(id)}`);
  },

  elegir(solicitudId: string, postulacionId: string): Promise<Solicitud> {
    return pedir<Solicitud>(`/solicitudes/${encodeURIComponent(solicitudId)}/elegir`, enviar('POST', { postulacionId }));
  },

  async listPostulaciones(filtros: { solicitudId?: string; providerId?: string } = {}): Promise<Postulacion[]> {
    const { items } = await pedir<{ items: Postulacion[] }>(`/postulaciones${query(filtros)}`);
    return items;
  },

  createPostulacion(input: PostulacionInput): Promise<Postulacion> {
    return pedir<Postulacion>('/postulaciones', enviar('POST', input));
  },

  async listCotizaciones(filtros: { solicitudId?: string; providerId?: string; clienteId?: string } = {}): Promise<Cotizacion[]> {
    const { items } = await pedir<{ items: Cotizacion[] }>(`/cotizaciones${query(filtros)}`);
    return items;
  },

  createCotizacion(input: CotizacionInput): Promise<Cotizacion> {
    return pedir<Cotizacion>('/cotizaciones', enviar('POST', input));
  },

  patchCotizacion(id: string, patch: CotizacionPatch): Promise<Cotizacion> {
    return pedir<Cotizacion>(`/cotizaciones/${encodeURIComponent(id)}`, enviar('PATCH', patch));
  },

  /** Reseñas de un profesional. El endpoint filtra por id, por dirección o por ambos. */
  async listResenas(filtros: { providerId?: string; providerAddress?: string } = {}): Promise<Resena[]> {
    const { items } = await pedir<{ items: Resena[] }>(`/resenas${query(filtros)}`);
    return items;
  },

  /** Devuelve null cuando todavía no hay reseña, que no es un error. */
  async getResena(jobId: string): Promise<Resena | null> {
    try {
      return await pedir<Resena>(`/resenas/${encodeURIComponent(jobId)}`);
    } catch (cause) {
      if (cause instanceof ApiCallError && cause.code === 'NOT_FOUND') return null;
      throw cause;
    }
  },

  putResena(jobId: string, input: ResenaInput): Promise<Resena> {
    return pedir<Resena>(`/resenas/${encodeURIComponent(jobId)}`, enviar('PUT', input));
  },

  async listDisputas(): Promise<Disputa[]> {
    const { items } = await pedir<{ items: Disputa[] }>('/disputas');
    return items;
  },

  /** Null cuando nadie ha dejado su versión todavía, que no es un error. */
  async getDisputa(jobId: string): Promise<Disputa | null> {
    try {
      return await pedir<Disputa>(`/disputas/${encodeURIComponent(jobId)}`);
    } catch (cause) {
      if (cause instanceof ApiCallError && cause.code === 'NOT_FOUND') return null;
      throw cause;
    }
  },

  putDescargo(jobId: string, input: DescargoInput): Promise<Disputa> {
    return pedir<Disputa>(`/disputas/${encodeURIComponent(jobId)}`, enviar('PUT', input));
  },

  async fotosDescargo(jobId: string, parte: ParteEnDisputa): Promise<string[]> {
    const { fotos } = await pedir<FotosDescargo>(`/disputas/${encodeURIComponent(jobId)}/fotos/${parte}`);
    return fotos;
  },
};
