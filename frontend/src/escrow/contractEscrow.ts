import { contract } from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';
import type { EscrowArguments, Job, RatingSource, RatingSummary } from '../../../shared/escrow';
import { CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL } from '../config';
import type { EscrowGateway } from './gateway';

/**
 * El escrow de verdad, en testnet. Misma interfaz que el mock, así que ninguna
 * pantalla cambia: solo se elige otra implementación en `index.ts`.
 *
 * Cada escritura se arma con `contract.Client`, se firma con la huella
 * (`kit.sign`) y se envía por `/api/relayer`, que paga la comisión en XLM. El
 * usuario nunca necesita saldo para gas.
 */
type Tx<T> = contract.AssembledTransaction<T>;

export interface EscrowContract {
  get_job: (args: { job_id: bigint }) => Promise<Tx<Job>>;
  jobs_of: (args: { provider: string }) => Promise<Tx<bigint[]>>;
  rating_of: (args: { provider: string }) => Promise<Tx<RatingSummary>>;
  create_job: (args: EscrowArguments['create_job']) => Promise<Tx<bigint>>;
  accept: (args: { job_id: bigint }) => Promise<Tx<null>>;
  fund: (args: { job_id: bigint }) => Promise<Tx<null>>;
  start: (args: { job_id: bigint }) => Promise<Tx<null>>;
  submit: (args: { job_id: bigint }) => Promise<Tx<null>>;
  approve: (args: { job_id: bigint }) => Promise<Tx<null>>;
  auto_release: (args: { job_id: bigint; caller: string }) => Promise<Tx<null>>;
  dispute: (args: { job_id: bigint; caller: string }) => Promise<Tx<null>>;
  resolve: (args: { job_id: bigint; provider_bps: number }) => Promise<Tx<null>>;
  rate: (args: { job_id: bigint; stars: number; comment_hash: Buffer }) => Promise<Tx<null>>;
}

export interface ContractEscrowDeps {
  /** Cliente del contrato. Se inyecta para poder probar sin red. */
  cliente: () => Promise<EscrowContract>;
  /** Firma con la huella y devuelve el hash de la transacción. */
  firmarYEnviar: <T>(tx: Tx<T>, address: string) => Promise<string>;
  /** Dirección `C…` de la cuenta conectada. */
  direccion: () => Promise<string | undefined>;
  almacen: Pick<Storage, 'getItem' | 'setItem'>;
}

const INDICE = 'masi.escrow.mis-trabajos.v1';

/**
 * Las funciones que devuelven `Result<T, Error>` llegan envueltas según la versión
 * de los bindings. Esto acepta las dos formas sin suponer ninguna.
 */
function valor<T>(resultado: unknown): T {
  const envuelto = resultado as { unwrap?: () => T };
  return typeof envuelto?.unwrap === 'function' ? envuelto.unwrap() : (resultado as T);
}

async function cuenta(deps: ContractEscrowDeps): Promise<string> {
  const address = await deps.direccion();
  // Mismo código que usa el contrato cuando el rol no corresponde: "no puedes hacer esto".
  if (!address) throw new Error('HostError: Error(Contract, #5)');
  return address;
}

/** Los trabajos del cliente no están indexados on-chain: `jobs_of` solo indexa por proveedor. */
function leerIndice(deps: ContractEscrowDeps, address: string): bigint[] {
  try {
    const crudo = JSON.parse(deps.almacen.getItem(INDICE) ?? '{}') as Record<string, string[]>;
    return (crudo[address] ?? []).map(BigInt);
  } catch {
    return [];
  }
}

function anotarIndice(deps: ContractEscrowDeps, address: string, jobId: bigint): void {
  try {
    const crudo = JSON.parse(deps.almacen.getItem(INDICE) ?? '{}') as Record<string, string[]>;
    const actuales = new Set(crudo[address] ?? []);
    actuales.add(jobId.toString());
    deps.almacen.setItem(INDICE, JSON.stringify({ ...crudo, [address]: [...actuales] }));
  } catch {
    // Sin almacenamiento el trabajo existe igual en la cadena; solo no sale en la lista.
  }
}

export function createContractEscrow(deps: ContractEscrowDeps): EscrowGateway {
  const escribir = async <T>(construir: (c: EscrowContract, address: string) => Promise<Tx<T>>): Promise<{ hash: string }> => {
    const address = await cuenta(deps);
    const tx = await construir(await deps.cliente(), address);
    return { hash: await deps.firmarYEnviar(tx, address) };
  };

  return {
    async getJob(jobId) {
      const tx = await (await deps.cliente()).get_job({ job_id: jobId });
      return valor<Job>(tx.result);
    },

    async jobsOf(address) {
      const cliente = await deps.cliente();
      const comoProveedor = valor<bigint[]>((await cliente.jobs_of({ provider: address })).result);
      const ids = [...new Set([...comoProveedor, ...leerIndice(deps, address)].map(String))].map(BigInt);
      const trabajos = await Promise.all(ids.map(async id => valor<Job>((await cliente.get_job({ job_id: id })).result)));
      return trabajos.sort((uno, otro) => Number(otro.id - uno.id));
    },

    async createJob(args) {
      const address = await cuenta(deps);
      const tx = await (await deps.cliente()).create_job(args);
      // La simulación ya devuelve el id que el contrato va a asignar.
      const jobId = valor<bigint>(tx.result);
      const hash = await deps.firmarYEnviar(tx, address);
      anotarIndice(deps, address, jobId);
      return { jobId, hash };
    },

    accept: jobId => escribir(cliente => cliente.accept({ job_id: jobId })),
    fund: jobId => escribir(cliente => cliente.fund({ job_id: jobId })),
    start: jobId => escribir(cliente => cliente.start({ job_id: jobId })),
    submit: jobId => escribir(cliente => cliente.submit({ job_id: jobId })),
    approve: jobId => escribir(cliente => cliente.approve({ job_id: jobId })),
    autoRelease: (jobId, caller) => escribir(cliente => cliente.auto_release({ job_id: jobId, caller })),
    dispute: (jobId, caller) => escribir(cliente => cliente.dispute({ job_id: jobId, caller })),

    /** La firma el árbitro (Masi), no un usuario de la app. */
    async resolve() {
      throw new Error('La resolución de una disputa la firma el árbitro de Masi.');
    },

    rate: (jobId, stars, commentHash) => escribir(cliente =>
      cliente.rate({ job_id: jobId, stars, comment_hash: Buffer.from(commentHash) })),
  };
}

let cacheado: Promise<EscrowContract> | null = null;

/** `Client.from` lee el ABI del propio contrato en la red: no hace falta codegen. */
export function clienteDelContrato(): Promise<EscrowContract> {
  cacheado ??= contract.Client.from({
    contractId: CONTRACT_ID,
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
  }) as unknown as Promise<EscrowContract>;
  return cacheado;
}

/**
 * `passkey-kit` se carga solo al firmar: crear el kit necesita el navegador, y
 * importarlo arriba rompería cualquier test que toque una pantalla.
 */
const passkeys = () => import('../passkeys');

export const contractEscrow: EscrowGateway = createContractEscrow({
  cliente: clienteDelContrato,
  firmarYEnviar: async (tx, address) => (await passkeys()).signAndSend(tx, address),
  direccion: async () => (await passkeys()).connectedAddress(),
  almacen: { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) },
});

/** Las estrellas del perfil salen del contrato, no de un archivo nuestro. */
export const contractRatingSource: RatingSource = {
  async rating_of(provider) {
    const tx = await (await clienteDelContrato()).rating_of({ provider });
    return valor<RatingSummary>(tx.result);
  },
};
