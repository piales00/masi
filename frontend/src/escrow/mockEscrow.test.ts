import { beforeEach, describe, expect, it } from 'vitest';
import { mockEscrow } from './mockEscrow';
import { solesToStroops } from '../money';

const JOBS_KEY = 'masi.demo.trabajos.v1';
const nuevo = () => mockEscrow.createJob({
  client: 'cliente-1',
  provider: 'profesional-1',
  amount: solesToStroops('1200'),
  materials_bps: 3000,
  fee_bps: 500,
  review_secs: 86400n,
  description: 'Pintar la sala',
});

beforeEach(() => { localStorage.clear(); });

describe('transiciones válidas', () => {
  it('recorre el camino completo hasta Released', async () => {
    const { jobId } = await nuevo();
    expect((await mockEscrow.getJob(jobId)).state.tag).toBe('Requested');
    await mockEscrow.accept(jobId);
    expect((await mockEscrow.getJob(jobId)).state.tag).toBe('Accepted');
    await mockEscrow.fund(jobId);
    expect((await mockEscrow.getJob(jobId)).state.tag).toBe('Funded');
    await mockEscrow.start(jobId);
    expect((await mockEscrow.getJob(jobId)).state.tag).toBe('Started');
    await mockEscrow.submit(jobId);
    expect((await mockEscrow.getJob(jobId)).state.tag).toBe('Submitted');
    await mockEscrow.approve(jobId);

    const job = await mockEscrow.getJob(jobId);
    expect(job.state.tag).toBe('Released');
    expect(job.released_at).toBeDefined();
  });

  it('mueve el saldo igual que el contrato', async () => {
    const { jobId } = await nuevo();
    expect((await mockEscrow.getJob(jobId)).remaining_amount).toBe(0n);
    await mockEscrow.accept(jobId);
    await mockEscrow.fund(jobId);
    expect((await mockEscrow.getJob(jobId)).remaining_amount).toBe(solesToStroops('1200'));
    await mockEscrow.start(jobId);

    const job = await mockEscrow.getJob(jobId);
    expect(job.materials_amount).toBe(solesToStroops('360'));
    expect(job.fee_amount).toBe(solesToStroops('60'));
    expect(job.remaining_amount).toBe(solesToStroops('840'));
  });

  it('disputa desde Started y desde Submitted, y resuelve', async () => {
    const primero = await nuevo();
    await mockEscrow.accept(primero.jobId);
    await mockEscrow.fund(primero.jobId);
    await mockEscrow.start(primero.jobId);
    await mockEscrow.dispute(primero.jobId, 'cliente-1');
    expect((await mockEscrow.getJob(primero.jobId)).state.tag).toBe('Disputed');

    await mockEscrow.resolve(primero.jobId, 6000);
    expect((await mockEscrow.getJob(primero.jobId)).state.tag).toBe('Resolved');
  });
});

describe('transiciones inválidas', () => {
  it('rechaza saltarse un paso con #4', async () => {
    const { jobId } = await nuevo();
    await expect(mockEscrow.fund(jobId)).rejects.toThrow('#4');
    await expect(mockEscrow.start(jobId)).rejects.toThrow('#4');
    await expect(mockEscrow.approve(jobId)).rejects.toThrow('#4');
  });

  it('no repite una transición ya hecha', async () => {
    const { jobId } = await nuevo();
    await mockEscrow.accept(jobId);
    await expect(mockEscrow.accept(jobId)).rejects.toThrow('#4');
  });

  it('no deja disputar fuera de Started ni Submitted', async () => {
    const { jobId } = await nuevo();
    await expect(mockEscrow.dispute(jobId, 'cliente-1')).rejects.toThrow('#4');
  });

  it('responde #3 cuando el trabajo no existe', async () => {
    await expect(mockEscrow.getJob(4242n)).rejects.toThrow('#3');
  });

  it('conserva las validaciones de creación de F3', async () => {
    const base = { client: 'a', provider: 'b', materials_bps: 3000, fee_bps: 500, review_secs: 86400n, description: 'x' };
    await expect(mockEscrow.createJob({ ...base, amount: 0n })).rejects.toThrow('#6');
    await expect(mockEscrow.createJob({ ...base, amount: 100n, materials_bps: 6000 })).rejects.toThrow('#7');
    await expect(mockEscrow.createJob({ ...base, amount: 100n, client: 'a', provider: 'a' })).rejects.toThrow('#10');
  });
});

describe('liberación automática', () => {
  it('rechaza con #12 mientras el plazo sigue corriendo', async () => {
    const { jobId } = await nuevo();
    await mockEscrow.accept(jobId);
    await mockEscrow.fund(jobId);
    await mockEscrow.start(jobId);
    await mockEscrow.submit(jobId);
    await expect(mockEscrow.autoRelease(jobId, 'profesional-1')).rejects.toThrow('#12');
  });

  it('libera cuando el plazo venció', async () => {
    await mockEscrow.getJob(910n);
    const { hash } = await mockEscrow.autoRelease(910n, 'demo-profesional');
    expect(hash).toMatch(/^[0-9a-f]+$/);
    expect((await mockEscrow.getJob(910n)).state.tag).toBe('Released');
  });
});

describe('calificar', () => {
  it('solo se puede una vez y solo con el trabajo terminado', async () => {
    const { jobId } = await nuevo();
    const hash = new Uint8Array(32).fill(7);
    await expect(mockEscrow.rate(jobId, 5, hash)).rejects.toThrow('#4');

    await mockEscrow.accept(jobId);
    await mockEscrow.fund(jobId);
    await mockEscrow.start(jobId);
    await mockEscrow.submit(jobId);
    await mockEscrow.approve(jobId);

    await expect(mockEscrow.rate(jobId, 0, hash)).rejects.toThrow('#16');
    await mockEscrow.rate(jobId, 5, hash);

    const job = await mockEscrow.getJob(jobId);
    expect(job.rated).toBe(true);
    expect(job.stars).toBe(5);
    expect(job.comment_hash).toEqual(hash);

    await expect(mockEscrow.rate(jobId, 4, hash)).rejects.toThrow('#15');
  });
});

describe('compatibilidad con los trabajos de F3', () => {
  it('lee un trabajo antiguo sin estado y con created_at en ISO', async () => {
    localStorage.setItem(JOBS_KEY, JSON.stringify([{
      id: '1',
      client: 'cliente-1',
      provider: 'profesional-1',
      amount: '12000000000',
      materials_bps: 3000,
      fee_bps: 500,
      review_secs: '86400',
      description: 'Trabajo de F3',
      created_at: '2026-09-21T18:00:00.000Z',
    }]));

    const job = await mockEscrow.getJob(1n);
    expect(job.state.tag).toBe('Requested');
    expect(job.created_at).toBe(BigInt(Math.floor(Date.parse('2026-09-21T18:00:00.000Z') / 1000)));
    expect(job.rated).toBe(false);
    expect(job.stars).toBe(0);
    expect(job.submitted_at).toBeUndefined();
    expect(job.materials_amount).toBe(solesToStroops('360'));
  });

  it('un trabajo de F3 puede seguir avanzando', async () => {
    localStorage.setItem(JOBS_KEY, JSON.stringify([{
      id: '1', client: 'c', provider: 'p', amount: '12000000000', materials_bps: 3000,
      fee_bps: 500, review_secs: '86400', description: 'F3', created_at: '2026-09-21T18:00:00.000Z',
    }]));
    await mockEscrow.accept(1n);
    expect((await mockEscrow.getJob(1n)).state.tag).toBe('Accepted');
  });
});

describe('fixtures y numeración', () => {
  it('siembra un trabajo por estado sin pisar los reales', async () => {
    const jobs = await mockEscrow.jobsOf('demo-cliente');
    expect(jobs.map(job => job.id)).toEqual([901n, 902n, 903n, 904n, 905n, 906n, 907n, 908n, 909n, 910n]);
    expect(jobs.map(job => job.state.tag)).toEqual([
      'Requested', 'Accepted', 'Funded', 'Started', 'Submitted',
      'Released', 'Disputed', 'Resolved', 'Cancelled', 'Submitted',
    ]);
  });

  it('los trabajos reales siguen empezando en 1 aunque existan fixtures', async () => {
    await mockEscrow.getJob(901n);
    const primero = await nuevo();
    expect(primero.jobId).toBe(1n);
    const segundo = await nuevo();
    expect(segundo.jobId).toBe(2n);
  });

  it('jobsOf devuelve los trabajos de esa dirección en cualquiera de los dos lados', async () => {
    const { jobId } = await nuevo();
    expect((await mockEscrow.jobsOf('profesional-1')).map(job => job.id)).toContain(jobId);
    expect((await mockEscrow.jobsOf('cliente-1')).map(job => job.id)).toContain(jobId);
    expect((await mockEscrow.jobsOf('otra-persona'))).toHaveLength(0);
  });
});
