import { afterEach, expect, it, vi } from 'vitest';
import { remoteDemoEscrow } from './remoteDemoEscrow';
import { handleApi } from '../../server/api';
import { MemoryStore } from '../../server/store';

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

it('comparte un pedido entre navegadores independientes usando la API real en memoria', async () => {
  const store = new MemoryStore();
  await store.set('cotizaciones/q1', { id: 'q1', estado: 'enviada', clienteId: 'C_CLIENT', providerAddress: 'C_PROVIDER', totalStroops: '12000000000', materialsBps: 3000, feeBps: 500, reviewSecs: 86400, descripcion: 'Pintar' });
  vi.stubGlobal('fetch', vi.fn((path: string, init?: RequestInit) => handleApi(new Request(`https://masi.test${path}`, init), store)));
  localStorage.setItem('masi.demo.cliente.v2', JSON.stringify({ contractId: 'C_CLIENT' }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: true }));
  const receipt = await remoteDemoEscrow.createJob({ client: 'C_CLIENT', provider: 'C_PROVIDER', amount: 12000000000n, materials_bps: 3000, fee_bps: 500, review_secs: 86400n, description: 'Pintar' }, 'q1');
  expect(typeof receipt.jobId).toBe('bigint');
  localStorage.clear(); // Segundo celular: no depende de los datos del primero.
  localStorage.setItem('masi.demo.profesional.v2', JSON.stringify({ contractId: 'C_PROVIDER' }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ provider: true }));
  expect((await remoteDemoEscrow.jobsOf('C_PROVIDER'))[0].amount).toBe(12000000000n);
  await remoteDemoEscrow.accept(receipt.jobId);
  expect((await remoteDemoEscrow.getJob(receipt.jobId)).state.tag).toBe('Accepted');
  await expect(remoteDemoEscrow.fund(receipt.jobId)).rejects.toThrow('#5');
  localStorage.clear(); // De vuelta al cliente, misma API compartida.
  localStorage.setItem('masi.demo.cliente.v2', JSON.stringify({ contractId: 'C_CLIENT' }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: true }));
  await remoteDemoEscrow.fund(receipt.jobId);
  expect((await remoteDemoEscrow.getJob(receipt.jobId)).state.tag).toBe('Funded');
});
