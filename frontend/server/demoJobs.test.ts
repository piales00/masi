import { describe, expect, it } from 'vitest';
import { handleApi } from './api';
import { MemoryStore } from './store';

const quote = { id: 'q-demo', estado: 'enviada', clienteId: 'C_CLIENT', providerAddress: 'C_PROVIDER', totalStroops: '12000000000', materialesStroops: '3600000000', materialsBps: 3000, feeBps: 500, reviewSecs: 86400, descripcion: 'Pintar' };
const call = (store: MemoryStore, method: string, path = '', body?: unknown) => handleApi(new Request(`https://masi.test/api/demo-trabajos${path}`, {
  method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
}), store);
async function setup() {
  const store = new MemoryStore();
  await store.set('cotizaciones/q-demo', quote);
  const create = () => call(store, 'POST', '', { quotationId: quote.id, caller: quote.clienteId });
  const receipt = await (await create()).json();
  return { store, receipt, create };
}

describe('pedidos simulados compartidos', () => {
  it('dos clientes independientes ven todos los estados del mismo pedido', async () => {
    const { store, receipt } = await setup();
    const path = `/${receipt.jobId}`;
    expect(receipt.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await (await call(store, 'GET', '?address=C_PROVIDER')).json()).toMatchObject({ items: [{ id: receipt.jobId, state: 'Requested' }] });
    for (const [action, caller, state] of [
      ['accept', 'C_PROVIDER', 'Accepted'], ['fund', 'C_CLIENT', 'Funded'],
      ['start', 'C_PROVIDER', 'Started'], ['submit', 'C_PROVIDER', 'Submitted'], ['approve', 'C_CLIENT', 'Released'],
    ]) {
      expect((await call(store, 'POST', path, { action, caller })).status).toBe(200);
      // Otra petición, sin estado ni localStorage compartido con la primera.
      expect(await (await call(store, 'GET', path)).json()).toMatchObject({ state });
    }
    expect((await call(store, 'POST', path, { action: 'rate', caller: 'C_CLIENT', stars: 5, commentHash: 'a'.repeat(64) })).status).toBe(200);
    expect(await (await call(store, 'GET', path)).json()).toMatchObject({ rated: true, stars: 5 });
  });

  it('crear concurrentemente o reintentar devuelve el mismo pedido y comprobante', async () => {
    const store = new MemoryStore();
    await store.set('cotizaciones/q-demo', quote);
    const create = () => call(store, 'POST', '', { quotationId: quote.id, caller: quote.clienteId });
    const results = await Promise.all([create(), create()]);
    const receipts = await Promise.all(results.map(result => result.json()));
    expect(receipts[0]).toEqual(receipts[1]);
    expect(await (await create()).json()).toEqual(receipts[0]);
    expect(await store.list('demo-trabajos/')).toHaveLength(1);
  });

  it('rechaza otra parte, cambios de orden y dobles escrituras concurrentes', async () => {
    const { store, receipt } = await setup();
    const path = `/${receipt.jobId}`;
    expect((await call(store, 'POST', path, { action: 'accept', caller: 'C_OTHER' })).status).toBe(403);
    expect((await call(store, 'POST', path, { action: 'fund', caller: 'C_CLIENT' })).status).toBe(409);
    const responses = await Promise.all([1, 2].map(() => call(store, 'POST', path, { action: 'accept', caller: 'C_PROVIDER' })));
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
  });

  it('no expone resolución administrativa y conserva la disputa', async () => {
    const { store, receipt } = await setup();
    const path = `/${receipt.jobId}`;
    for (const [action, caller] of [['accept', 'C_PROVIDER'], ['fund', 'C_CLIENT'], ['start', 'C_PROVIDER'], ['dispute', 'C_CLIENT']]) {
      expect((await call(store, 'POST', path, { action, caller })).status).toBe(200);
    }
    expect((await call(store, 'POST', path, { action: 'resolve', caller: 'C_CLIENT' })).status).toBe(400);
    expect(await (await call(store, 'GET', path)).json()).toMatchObject({ state: 'Disputed' });
  });
});
