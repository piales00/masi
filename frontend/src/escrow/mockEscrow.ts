import { MAX_MATERIALS_BPS } from '../config';
import type { EscrowArguments } from '../../../shared/escrow';
import type { EscrowGateway } from './gateway';

const JOBS_KEY = 'masi.demo.trabajos.v1';
const MAX_DESCRIPTION_BYTES = 1024;

/** F4 completa el resto de la máquina de estados sobre este mismo almacén. */
interface StoredJob {
  id: string;
  client: string;
  provider: string;
  amount: string;
  materials_bps: number;
  fee_bps: number;
  review_secs: string;
  description: string;
  created_at: string;
}

function readJobs(): StoredJob[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    const value = raw ? JSON.parse(raw) : null;
    return Array.isArray(value) ? value as StoredJob[] : [];
  } catch {
    return [];
  }
}

function writeJobs(jobs: StoredJob[]): void {
  try {
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  } catch {
    // Sin almacenamiento el trabajo solo vive en esta pestaña.
  }
}

const pendiente = (nombre: string) => async (): Promise<never> => {
  throw new Error(`${nombre} llega en F4.`);
};

/** Códigos reales del contrato para ejercitar friendlyError. */
export const mockEscrow: EscrowGateway = {
  async createJob(args: EscrowArguments['create_job']) {
    if (args.amount <= 0n) throw new Error('HostError: Error(Contract, #6)');
    if (args.materials_bps > MAX_MATERIALS_BPS) throw new Error('HostError: Error(Contract, #7)');
    if (new TextEncoder().encode(args.description).length > MAX_DESCRIPTION_BYTES) {
      throw new Error('HostError: Error(Contract, #9)');
    }
    if (args.client === args.provider) throw new Error('HostError: Error(Contract, #10)');

    const jobs = readJobs();
    const jobId = BigInt(jobs.length + 1);
    jobs.push({
      id: jobId.toString(),
      client: args.client,
      provider: args.provider,
      amount: args.amount.toString(),
      materials_bps: args.materials_bps,
      fee_bps: args.fee_bps,
      review_secs: args.review_secs.toString(),
      description: args.description,
      created_at: new Date().toISOString(),
    });
    writeJobs(jobs);
    return { jobId, hash: crypto.randomUUID().replaceAll('-', '') };
  },

  getJob: pendiente('Ver el trabajo'),
  accept: pendiente('Confirmar el trabajo'),
  fund: pendiente('Pagar'),
  start: pendiente('Iniciar'),
  submit: pendiente('Marcar como terminado'),
  approve: pendiente('Aprobar'),
  autoRelease: pendiente('Liberar el pago'),
  rate: pendiente('Calificar'),
};
