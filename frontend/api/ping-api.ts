/** Diagnóstico: importa el módulo de la API, como router.ts. */
import { handleApi } from '../server/api';
import { MemoryStore } from '../server/store';

export function GET(req: Request): Promise<Response> {
  return handleApi(req, new MemoryStore(), 'salud');
}
