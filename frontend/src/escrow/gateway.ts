import type { EscrowArguments, Job } from '../../../shared/escrow';

/**
 * Frontera con el contrato. F3 usa createJob; F4 completa el resto contra el mock y
 * el día de la integración se cambia la implementación sin tocar ninguna pantalla.
 *
 * dispute y resolve existen en el ABI (`EscrowArguments`) y hoy el contrato desplegado
 * responde NotImplemented (#13): el mock sí las reproduce para poder construir la UI.
 */
export interface EscrowGateway {
  getJob(jobId: bigint): Promise<Job>;
  /**
   * Trabajos donde la dirección es cliente o profesional. El `jobs_of` del contrato
   * solo indexa por proveedor; el lado del cliente lo resolverá el almacén compartido
   * de F5. Para la demo local basta con recorrer el almacén.
   */
  jobsOf(address: string): Promise<Job[]>;
  createJob(args: EscrowArguments['create_job'], quotationId?: string): Promise<{ jobId: bigint; hash: string }>;
  accept(jobId: bigint): Promise<{ hash: string }>;
  fund(jobId: bigint): Promise<{ hash: string }>;
  start(jobId: bigint): Promise<{ hash: string }>;
  submit(jobId: bigint): Promise<{ hash: string }>;
  approve(jobId: bigint): Promise<{ hash: string }>;
  autoRelease(jobId: bigint, caller: string): Promise<{ hash: string }>;
  dispute(jobId: bigint, caller: string): Promise<{ hash: string }>;
  resolve(jobId: bigint, providerBps: number): Promise<{ hash: string }>;
  rate(jobId: bigint, stars: number, commentHash: Uint8Array): Promise<{ hash: string }>;
}
