import { createHash } from 'node:crypto';
import { createMockEscrow, type StoredJob } from '../src/escrow/mockEscrow.js';
import type { Cotizacion } from '../../shared/api.js';
import type { KeyValueStore } from './store.js';

interface RecordJob { revision: number; quotationId: string; row: StoredJob; hash: string }
const prefix = 'demo-trabajos/';
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
const fail = (status: number, message: string) => reply({ error: { code: status === 409 ? 'CONFLICT' : status === 404 ? 'NOT_FOUND' : 'INVALID', message } }, status);

/** Almacén de DEMOSTRACIÓN sin dinero ni autorización de servidor, igual que la API del marketplace. */
export async function handleDemoJobs(req: Request, store: KeyValueStore): Promise<Response> {
  const url = new URL(req.url);
  const id = url.pathname.split('/')[3];
  if (id && !/^[1-9][0-9]*$/.test(id)) return fail(400, 'Trabajo inválido.');
  if (req.method === 'GET') {
    if (id) {
      const record = await store.get(prefix + id) as RecordJob | null;
      return record ? reply(record.row) : fail(404, 'HostError: Error(Contract, #3)');
    }
    const address = url.searchParams.get('address');
    if (!address) return reply({ items: [] });
    const records = await Promise.all((await store.list(prefix)).map(key => store.get(key) as Promise<RecordJob | null>));
    return reply({ items: records.filter((item): item is RecordJob => !!item && (item.row.client === address || item.row.provider === address)).map(item => item.row) });
  }
  if (req.method !== 'POST') return fail(400, 'Se requiere POST.');
  if (!store.compareAndSet) return fail(503, 'El almacén no permite actualizaciones seguras.');
  const body = await req.json().catch(() => null);
  if (!body || typeof body.caller !== 'string') return fail(400, 'Cuenta inválida.');
  if (!id) {
    if (typeof body.quotationId !== 'string') return fail(400, 'Falta la cotización.');
    const quote = await store.get(`cotizaciones/${body.quotationId}`) as Cotizacion | null;
    if (!quote) return fail(404, 'Cotización no encontrada.');
    if (body.caller !== quote.clienteId) return fail(403, 'HostError: Error(Contract, #5)');
    // La misma cotización siempre genera el mismo pedido, incluso con reintentos o dos pestañas.
    const jobId = (createHash('sha256').update(quote.id).digest().readBigUInt64BE() || 1n).toString();
    const key = prefix + jobId;
    const existing = await store.get(key) as RecordJob | null;
    if (existing) return existing.quotationId === quote.id ? reply({ jobId, hash: existing.hash }) : fail(409, 'Conflicto de identificador.');
    if (quote.estado !== 'enviada') return fail(409, 'La cotización ya fue resuelta.');
    let rows: StoredJob[] = [];
    const engine = createMockEscrow({ getItem: () => JSON.stringify(rows), setItem: (_key, value) => { rows = JSON.parse(value); } }, false);
    const result = await engine.createJob({ client: quote.clienteId, provider: quote.providerAddress,
      amount: BigInt(quote.totalStroops), materials_bps: quote.materialsBps, fee_bps: quote.feeBps,
      review_secs: BigInt(quote.reviewSecs), description: quote.descripcion });
    rows[0].id = jobId;
    const record: RecordJob = { revision: 1, quotationId: quote.id, row: rows[0], hash: result.hash };
    if (!await store.compareAndSet(key, null, record)) {
      const winner = await store.get(key) as RecordJob;
      return winner.quotationId === quote.id ? reply({ jobId, hash: winner.hash }) : fail(409, 'Conflicto de identificador.');
    }
    return reply({ jobId, hash: result.hash }, 201);
  }
  const key = prefix + id;
  const current = await store.get(key) as RecordJob | null;
  if (!current) return fail(404, 'HostError: Error(Contract, #3)');
  const action = String(body.action ?? '');
  const clientActions = ['fund', 'approve', 'rate'];
  const providerActions = ['accept', 'start', 'submit'];
  if (![...clientActions, ...providerActions, 'dispute', 'autoRelease'].includes(action)) return fail(400, 'Acción inválida.');
  const expected = clientActions.includes(action) ? current.row.client : providerActions.includes(action) ? current.row.provider : null;
  if (expected ? body.caller !== expected : ![current.row.client, current.row.provider].includes(body.caller)) return fail(403, 'HostError: Error(Contract, #5)');
  let row = structuredClone(current.row);
  const engine = createMockEscrow({ getItem: () => JSON.stringify([row]), setItem: (_key, value) => { row = JSON.parse(value)[0]; } }, false);
  try {
    let receipt: { hash: string };
    const jobId = BigInt(id);
    if (action === 'rate') {
      if (!Number.isInteger(body.stars) || typeof body.commentHash !== 'string' || !/^[0-9a-f]{64}$/.test(body.commentHash)) return fail(400, 'Calificación inválida.');
      receipt = await engine.rate(jobId, body.stars, Uint8Array.from(Buffer.from(body.commentHash, 'hex')));
    } else if (action === 'dispute' || action === 'autoRelease') {
      receipt = await engine[action](jobId, body.caller);
    } else {
      receipt = await engine[action as 'accept' | 'fund' | 'start' | 'submit' | 'approve'](jobId);
    }
    const updated: RecordJob = { ...current, row, revision: current.revision + 1 };
    if (!await store.compareAndSet(key, current.revision, updated)) return fail(409, 'HostError: Error(Contract, #4)');
    return reply(receipt);
  } catch (cause) {
    return fail(409, cause instanceof Error ? cause.message : 'No se pudo actualizar el pedido.');
  }
}
