/** Diagnóstico: importa el almacén de Upstash. */
import { redisStore } from '../server/redisStore';

export function GET(): Response {
  return Response.json({ tipo: typeof redisStore });
}
