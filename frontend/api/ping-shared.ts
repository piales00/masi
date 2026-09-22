import { TRADES } from '../../shared/trades.js';
export function GET(): Response { return Response.json({ ok: TRADES.length }); }
