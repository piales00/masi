import { handleApi } from '../server/api.js';
import { redisStore } from '../server/redisStore.js';

/**
 * Vercel enruta aquí todo `/api/*` menos el relayer, con la ruta en el parámetro
 * `ruta` (ver `vercel.json`). Antes había un archivo comodín, pero solo atendía
 * rutas de un nivel: `/api/solicitudes` funcionaba y `/api/solicitudes/:id` daba 404.
 *
 * No se llama `index` a propósito: la regla de reescritura excluye `router`, para que
 * su propio destino no vuelva a entrar por la misma regla.
 *
 * Los imports relativos llevan extensión `.js` a propósito: el paquete es ESM
 * (`"type": "module"`) y en la Function de Vercel un import relativo sin extensión
 * falla al cargar. Comprobado en producción con dos sondas idénticas salvo por eso.
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
