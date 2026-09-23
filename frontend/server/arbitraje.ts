import { BASE_FEE, Contract, Keypair, TransactionBuilder, nativeToScVal, rpc } from '@stellar/stellar-sdk';
import type { ApiError } from '../../shared/api.js';

/**
 * Resolución de una disputa, firmada por el árbitro.
 *
 * `resolve` exige `config.arbiter.require_auth()`, así que la llave del árbitro tiene que
 * firmar. Vive solo aquí: si estuviera en el navegador, cualquiera podría repartir el
 * dinero retenido de otras personas.
 *
 * Por el mismo motivo el endpoint pide una clave de panel. Sin ella, quien diera con la
 * ruta tendría la firma del árbitro a su disposición.
 */
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const RPC_URL = 'https://soroban-testnet.stellar.org';

export const MAX_BPS = 10_000;

export interface ArbitrajeEnv {
  ESCROW_CONTRACT_ID?: string;
  ARBITER_SECRET?: string;
  ARBITER_PANEL_KEY?: string;
}

export function bpsValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= MAX_BPS;
}

/** El id del trabajo es un `u64`: se acepta como número o como cadena, nunca negativo. */
export function jobIdValido(valor: unknown): bigint | null {
  if (typeof valor === 'number') {
    if (!Number.isSafeInteger(valor) || valor < 0) return null;
    return BigInt(valor);
  }
  if (typeof valor !== 'string' || !/^\d+$/.test(valor.trim())) return null;
  const id = BigInt(valor.trim());
  return id <= 0xffffffffffffffffn ? id : null;
}

/**
 * Comparación en tiempo constante. Con `===` el navegador —o quien pruebe claves— podría
 * medir cuánto tarda en fallar y deducir el prefijo correcto carácter a carácter.
 *
 * La longitud sí se filtra, como en cualquier implementación práctica; lo que no se
 * filtra es el contenido.
 */
export function claveCorrecta(recibida: unknown, esperada: string): boolean {
  if (typeof recibida !== 'string') return false;
  const codificador = new TextEncoder();
  const a = codificador.encode(recibida);
  const b = codificador.encode(esperada);
  let diferencia = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    diferencia |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diferencia === 0;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

function fallo(status: number, code: ApiError['error']['code'], message: string): Response {
  return json({ error: { code, message } } satisfies ApiError, status);
}

export async function handleArbitraje(req: Request, env: ArbitrajeEnv): Promise<Response> {
  // Sin clave configurada el panel queda cerrado, no abierto: se falla del lado seguro.
  if (!env.ARBITER_PANEL_KEY) {
    return fallo(500, 'INTERNAL', 'El panel de arbitraje no está configurado en el servidor.');
  }
  // `NOT_ALLOWED` es el código de `shared/api.ts` para esto; el estado 401 es lo que
  // distingue "no autorizado" de "no puedes". No se explica por qué falló.
  if (!claveCorrecta(req.headers.get('x-masi-arbitraje'), env.ARBITER_PANEL_KEY)) {
    return fallo(401, 'NOT_ALLOWED', 'No autorizado.');
  }
  if (req.method !== 'POST') return fallo(400, 'INVALID', 'Se requiere POST.');

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return fallo(400, 'INVALID', 'El cuerpo debe ser JSON.');
  }
  const datos = cuerpo as { jobId?: unknown; providerBps?: unknown };
  const jobId = jobIdValido(datos.jobId);
  if (jobId === null) return fallo(400, 'INVALID', 'Falta el número de trabajo.');
  if (!bpsValido(datos.providerBps)) {
    return fallo(400, 'INVALID', `El reparto debe ser un entero entre 0 y ${MAX_BPS}.`);
  }

  if (!env.ARBITER_SECRET || !env.ESCROW_CONTRACT_ID) {
    return fallo(500, 'INTERNAL', 'El arbitraje no está configurado en el servidor.');
  }

  try {
    const arbitro = Keypair.fromSecret(env.ARBITER_SECRET);
    const servidor = new rpc.Server(RPC_URL);
    const cuenta = await servidor.getAccount(arbitro.publicKey());
    const tx = new TransactionBuilder(cuenta, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(new Contract(env.ESCROW_CONTRACT_ID).call(
        'resolve',
        nativeToScVal(jobId, { type: 'u64' }),
        nativeToScVal(datos.providerBps, { type: 'u32' }),
      ))
      .setTimeout(30)
      .build();

    const lista = await servidor.prepareTransaction(tx);
    lista.sign(arbitro);
    const enviada = await servidor.sendTransaction(lista);
    if (enviada.status === 'ERROR') return fallo(502, 'INTERNAL', 'No se pudo resolver la disputa.');
    const final = await servidor.pollTransaction(enviada.hash);
    if (final.status !== 'SUCCESS') return fallo(502, 'INTERNAL', 'No se pudo resolver la disputa.');

    return json({ hash: enviada.hash });
  } catch {
    return fallo(502, 'INTERNAL', 'No se pudo resolver la disputa.');
  }
}
