import { MemoryStore } from '../server/store';
export function GET(): Response { return Response.json({ ok: typeof MemoryStore }); }
