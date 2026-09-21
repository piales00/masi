import type { EscrowArguments, Job } from '../../../shared/escrow';

/**
 * Frontera con el contrato. F3 solo usa createJob; el resto lo completa F4 con el mock
 * y el 22 se cambia la implementación sin tocar ninguna pantalla.
 */
export interface EscrowGateway {
  getJob(jobId: bigint): Promise<Job>;
  createJob(args: EscrowArguments['create_job']): Promise<{ jobId: bigint; hash: string }>;
  accept(jobId: bigint): Promise<{ hash: string }>;
  fund(jobId: bigint): Promise<{ hash: string }>;
  start(jobId: bigint): Promise<{ hash: string }>;
  submit(jobId: bigint): Promise<{ hash: string }>;
  approve(jobId: bigint): Promise<{ hash: string }>;
  autoRelease(jobId: bigint, caller: string): Promise<{ hash: string }>;
  rate(jobId: bigint, stars: number, commentHash: Uint8Array): Promise<{ hash: string }>;
}
