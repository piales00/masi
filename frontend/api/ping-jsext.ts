import { MemoryStore } from '../server/store.js';
export function GET(): Response { return Response.json({ ok: typeof MemoryStore }); }
