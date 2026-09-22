import { MAX_MATERIALS_BPS } from '../config';
import { portion } from '../money';
import { JOB_STATES } from '../../../shared/escrow';
import type { EscrowArguments, Job, JobState } from '../../../shared/escrow';
import type { EscrowGateway } from './gateway';

const JOBS_KEY = 'masi.demo.trabajos.v1';
const MAX_DESCRIPTION_BYTES = 1024;
/** Los trabajos de muestra viven de 901 en adelante; los reales siguen siendo 1, 2, 3… */
const PRIMER_FIXTURE = 900n;

export type Tag = Job['state']['tag'];

/**
 * Lo que va a localStorage. Solo datos primarios: los montos derivados y el
 * `remaining_amount` se recalculan igual que el contrato, así nunca se contradicen.
 * Los campos opcionales faltan en los trabajos que creó F3, y por eso se toleran.
 */
interface StoredJob {
  id: string;
  client: string;
  provider: string;
  amount: string;
  materials_bps: number;
  fee_bps: number;
  review_secs: string;
  description: string;
  /** F3 lo guardó como ISO; ahora se admiten ISO y segundos. */
  created_at: string;
  state?: Tag;
  submitted_at?: string;
  released_at?: string;
  rated?: boolean;
  stars?: number;
  comment_hash?: string;
  /** Reparto del árbitro, solo cuando el caso se resolvió. */
  provider_bps?: number;
}

const estado = (tag: Tag): JobState => ({ tag, values: undefined as unknown as void });
const ahora = (): bigint => BigInt(Math.floor(Date.now() / 1000));
const nuevoHash = (): string => crypto.randomUUID().replaceAll('-', '');
// El tipo va en la constante, no solo en la flecha: así TypeScript sabe que corta el flujo.
const fallo: (codigo: number) => never = codigo => {
  throw new Error(`HostError: Error(Contract, #${codigo})`);
};

function aHex(bytes: Uint8Array): string {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function deHex(texto: string): Uint8Array {
  const pares = texto.match(/.{1,2}/g) ?? [];
  return Uint8Array.from(pares.map(par => Number.parseInt(par, 16)));
}

/** Acepta segundos o una fecha ISO, que es como F3 escribió `created_at`. */
function segundos(valor: string | undefined): bigint | undefined {
  if (!valor) return undefined;
  if (/^\d+$/.test(valor)) return BigInt(valor);
  const ms = Date.parse(valor);
  return Number.isNaN(ms) ? undefined : BigInt(Math.floor(ms / 1000));
}

/** Mismo recorrido que el contrato: 0 al crear, todo al pagar, menos materiales al iniciar. */
function restante(tag: Tag, amount: bigint, materiales: bigint): bigint {
  if (tag === 'Funded') return amount;
  if (tag === 'Started' || tag === 'Submitted' || tag === 'Disputed') return amount - materiales;
  return 0n;
}

export function toJob(row: StoredJob): Job {
  const amount = BigInt(row.amount);
  const materials_amount = portion(amount, row.materials_bps);
  const tag: Tag = row.state && JOB_STATES.includes(row.state) ? row.state : 'Requested';
  return {
    id: BigInt(row.id),
    client: row.client,
    provider: row.provider,
    amount,
    materials_bps: row.materials_bps,
    fee_bps: row.fee_bps,
    review_secs: BigInt(row.review_secs),
    description: row.description,
    state: estado(tag),
    materials_amount,
    fee_amount: portion(amount, row.fee_bps),
    remaining_amount: restante(tag, amount, materials_amount),
    created_at: segundos(row.created_at) ?? 0n,
    submitted_at: segundos(row.submitted_at),
    released_at: segundos(row.released_at),
    rated: row.rated === true,
    stars: typeof row.stars === 'number' ? row.stars : 0,
    comment_hash: row.comment_hash ? deHex(row.comment_hash) : undefined,
  };
}

const VIDEO = { amount: '12000000000', materials_bps: 3000, fee_bps: 500, review_secs: '86400' };
const FIXTURE_CLIENTE = 'demo-cliente';
const FIXTURE_PROFESIONAL = 'demo-profesional';

/**
 * Un trabajo por estado para revisar cada vista sin recorrer el flujo entero. Las marcas
 * de tiempo son relativas al momento de sembrar: 905 sigue en plazo de revisión y 910 ya
 * venció, que es lo que distingue las dos vistas de `Submitted`.
 */
function fixtures(): StoredJob[] {
  const t = ahora();
  const base = (id: number, state: Tag, extra: Partial<StoredJob> = {}): StoredJob => ({
    id: String(id),
    client: FIXTURE_CLIENTE,
    provider: FIXTURE_PROFESIONAL,
    ...VIDEO,
    description: 'Pintar la sala del departamento, dos manos de látex.',
    created_at: String(t - 86400n),
    state,
    ...extra,
  });
  return [
    base(901, 'Requested'),
    base(902, 'Accepted'),
    base(903, 'Funded'),
    base(904, 'Started'),
    base(905, 'Submitted', { submitted_at: String(t - 3600n) }),
    base(906, 'Released', { submitted_at: String(t - 172800n), released_at: String(t - 86000n) }),
    base(907, 'Disputed', { submitted_at: String(t - 7200n) }),
    base(908, 'Resolved', { submitted_at: String(t - 172800n), released_at: String(t - 86000n), provider_bps: 6000 }),
    base(909, 'Cancelled'),
    base(910, 'Submitted', { submitted_at: String(t - 172800n) }),
  ];
}

function writeRows(rows: StoredJob[]): void {
  try {
    localStorage.setItem(JOBS_KEY, JSON.stringify(rows));
  } catch {
    // Sin almacenamiento el trabajo solo vive en esta pestaña.
  }
}

function readRows(): StoredJob[] {
  let rows: StoredJob[] = [];
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    const value = raw ? JSON.parse(raw) : null;
    rows = Array.isArray(value) ? value as StoredJob[] : [];
  } catch {
    rows = [];
  }
  // Se siembra una sola vez y nunca se pisa lo que ya existe.
  if (!rows.some(row => BigInt(row.id) > PRIMER_FIXTURE)) {
    rows = [...rows, ...fixtures()];
    writeRows(rows);
  }
  return rows;
}

function buscar(rows: StoredJob[], jobId: bigint): StoredJob {
  const row = rows.find(item => item.id === jobId.toString());
  if (!row) return fallo(3);
  return row;
}

const tagDe = (row: StoredJob): Tag => (row.state && JOB_STATES.includes(row.state) ? row.state : 'Requested');

/** Guarda el cambio si el estado de partida es el que exige el contrato; si no, #4. */
function avanzar(jobId: bigint, desde: readonly Tag[], cambio: (row: StoredJob) => void): { hash: string } {
  const rows = readRows();
  const row = buscar(rows, jobId);
  if (!desde.includes(tagDe(row))) fallo(4);
  cambio(row);
  writeRows(rows);
  return { hash: nuevoHash() };
}

export const mockEscrow: EscrowGateway = {
  async createJob(args: EscrowArguments['create_job']) {
    if (args.amount <= 0n) fallo(6);
    if (args.materials_bps > MAX_MATERIALS_BPS) fallo(7);
    if (new TextEncoder().encode(args.description).length > MAX_DESCRIPTION_BYTES) fallo(9);
    if (args.client === args.provider) fallo(10);

    const rows = readRows();
    // Los identificadores de muestra quedan fuera: los reales siguen su propia serie.
    const ultimo = rows
      .map(row => BigInt(row.id))
      .filter(id => id < PRIMER_FIXTURE)
      .reduce((mayor, id) => (id > mayor ? id : mayor), 0n);
    const jobId = ultimo + 1n;
    rows.push({
      id: jobId.toString(),
      client: args.client,
      provider: args.provider,
      amount: args.amount.toString(),
      materials_bps: args.materials_bps,
      fee_bps: args.fee_bps,
      review_secs: args.review_secs.toString(),
      description: args.description,
      created_at: new Date().toISOString(),
      state: 'Requested',
    });
    writeRows(rows);
    return { jobId, hash: nuevoHash() };
  },

  async getJob(jobId: bigint) {
    return toJob(buscar(readRows(), jobId));
  },

  async jobsOf(address: string) {
    return readRows()
      .filter(row => row.client === address || row.provider === address)
      .map(toJob);
  },

  async accept(jobId: bigint) {
    return avanzar(jobId, ['Requested'], row => { row.state = 'Accepted'; });
  },

  async fund(jobId: bigint) {
    return avanzar(jobId, ['Accepted'], row => { row.state = 'Funded'; });
  },

  async start(jobId: bigint) {
    return avanzar(jobId, ['Funded'], row => { row.state = 'Started'; });
  },

  async submit(jobId: bigint) {
    return avanzar(jobId, ['Started'], row => {
      row.state = 'Submitted';
      row.submitted_at = ahora().toString();
    });
  },

  async approve(jobId: bigint) {
    return avanzar(jobId, ['Submitted'], row => {
      row.state = 'Released';
      row.released_at = ahora().toString();
    });
  },

  async autoRelease(jobId: bigint) {
    const rows = readRows();
    const row = buscar(rows, jobId);
    if (tagDe(row) !== 'Submitted') fallo(4);
    const desde = segundos(row.submitted_at);
    if (desde === undefined) fallo(4);
    if (ahora() < desde + BigInt(row.review_secs)) fallo(12);
    row.state = 'Released';
    row.released_at = ahora().toString();
    writeRows(rows);
    return { hash: nuevoHash() };
  },

  async dispute(jobId: bigint) {
    return avanzar(jobId, ['Started', 'Submitted'], row => { row.state = 'Disputed'; });
  },

  async resolve(jobId: bigint, providerBps: number) {
    if (!Number.isInteger(providerBps) || providerBps < 0 || providerBps > 10_000) fallo(7);
    return avanzar(jobId, ['Disputed'], row => {
      row.state = 'Resolved';
      row.provider_bps = providerBps;
      row.released_at = ahora().toString();
    });
  },

  async rate(jobId: bigint, stars: number, commentHash: Uint8Array) {
    const rows = readRows();
    const row = buscar(rows, jobId);
    const tag = tagDe(row);
    if (tag !== 'Released' && tag !== 'Resolved') fallo(4);
    if (row.rated === true) fallo(15);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) fallo(16);
    row.rated = true;
    row.stars = stars;
    row.comment_hash = aHex(commentHash);
    writeRows(rows);
    return { hash: nuevoHash() };
  },
};
