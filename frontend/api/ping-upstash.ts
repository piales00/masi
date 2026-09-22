import { Redis } from '@upstash/redis';
export function GET(): Response { return Response.json({ ok: typeof Redis }); }
