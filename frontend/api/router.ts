import { handleApi } from '../server/api';
import { redisStore } from '../server/redisStore';

/**
 * Vercel enruta aquí todo `/api/*` menos el relayer, con la ruta en el parámetro
 * `ruta` (ver `vercel.json`). Antes había un archivo comodín, pero solo atendía
 * rutas de un nivel: `/api/solicitudes` funcionaba y `/api/solicitudes/:id` daba 404.
 *
 * No se llama `index` a propósito: la regla de reescritura excluye `router`, para que
 * su propio destino no vuelva a entrar por la misma regla.
 */
function ruta(req: Request): string {
  return new URL(req.url).searchParams.get('ruta') ?? '';
}

export function GET(req: Request): Promise<Response> {
  return handleApi(req, redisStore, ruta(req));
}

export function POST(req: Request): Promise<Response> {
  return handleApi(req, redisStore, ruta(req));
}

export function PATCH(req: Request): Promise<Response> {
  return handleApi(req, redisStore, ruta(req));
}

export function PUT(req: Request): Promise<Response> {
  return handleApi(req, redisStore, ruta(req));
}
