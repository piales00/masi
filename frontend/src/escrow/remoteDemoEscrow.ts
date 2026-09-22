import type { EscrowGateway } from './gateway';
import { toJob, type StoredJob } from './mockEscrow';

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/demo-trabajos${path}`, {
    method: body === undefined ? 'GET' : 'POST', cache: 'no-store',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'No se pudo actualizar el pedido.');
  return result as T;
}

function account(role: 'client' | 'provider'): string {
  const session = JSON.parse(localStorage.getItem('masi.demo.sesion.v2') || '{}');
  const profile = JSON.parse(localStorage.getItem(role === 'client' ? 'masi.demo.cliente.v2' : 'masi.demo.profesional.v2') || '{}');
  if (!session[role] || !profile.contractId) throw new Error('HostError: Error(Contract, #5)');
  return profile.contractId;
}
const change = async (id: bigint, action: string, role: 'client' | 'provider') => request<{ hash: string }>(`/${id}`, { action, caller: account(role) });

/** Misma simulación, persistida en la API para que ambos celulares vean el mismo estado. */
export const remoteDemoEscrow: EscrowGateway = {
  async getJob(id) { return toJob(await request<StoredJob>(`/${id}`)); },
  async jobsOf(address) { return (await request<{ items: StoredJob[] }>(`?address=${encodeURIComponent(address)}`)).items.map(toJob); },
  async createJob(args, quotationId) {
    const caller = account('client');
    if (caller !== args.client) throw new Error('HostError: Error(Contract, #5)');
    const result = await request<{ jobId: string; hash: string }>('', { quotationId, caller });
    return { ...result, jobId: BigInt(result.jobId) };
  },
  accept: id => change(id, 'accept', 'provider'),
  fund: id => change(id, 'fund', 'client'),
  start: id => change(id, 'start', 'provider'),
  submit: id => change(id, 'submit', 'provider'),
  approve: id => change(id, 'approve', 'client'),
  autoRelease: (id, caller) => request(`/${id}`, { action: 'autoRelease', caller }),
  dispute: (id, caller) => request(`/${id}`, { action: 'dispute', caller }),
  async resolve() { throw new Error('La resolución requiere al administrador de la demo.'); },
  rate: async (id, stars, commentHash) => request(`/${id}`, { action: 'rate', caller: account('client'), stars,
    commentHash: [...commentHash].map(byte => byte.toString(16).padStart(2, '0')).join('') }),
};
