import {
  Address, BASE_FEE, Contract, Keypair, TransactionBuilder, nativeToScVal, rpc, scValToNative,
} from '@stellar/stellar-sdk';
import type { ApiError } from '../../shared/api.js';

/**
 * Recarga simulada. En producción esto lo haría un anchor por SEP-24: el usuario paga
 * en soles y recibe el saldo. Aquí la cuenta emisora de PEN-test acredita el monto
 * directamente, que es el mismo `mint` del SAC, y la pantalla lo presenta como un pago.
 *
 * La llave de la emisora vive solo en el servidor. Nunca en el navegador.
 */
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const RPC_URL = 'https://soroban-testnet.stellar.org';

/** Tope de la simulación: nadie necesita más para el demo, y acota el ridículo. */
export const MAX_SOLES = 5_000;
const DECIMALES = 10_000_000n;

export interface RecargaEnv {
  PEN_SAC_ID?: string;
  ISSUER_SECRET?: string;
}

const DIRECCION_C = /^C[A-Z2-7]{55}$/;

export function aStroops(soles: unknown): bigint | null {
  if (typeof soles !== 'number' || !Number.isFinite(soles)) return null;
  if (soles <= 0 || soles > MAX_SOLES) return null;
  // Dos decimales como mucho: la interfaz trabaja en soles con céntimos.
  const centimos = Math.round(soles * 100);
  if (Math.abs(soles * 100 - centimos) > 1e-6) return null;
  return BigInt(centimos) * (DECIMALES / 100n);
}

export function direccionValida(address: unknown): address is string {
  return typeof address === 'string' && DIRECCION_C.test(address);
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

function fallo(status: number, code: ApiError['error']['code'], message: string): Response {
  return json({ error: { code, message } } satisfies ApiError, status);
}

async function saldoDe(servidor: rpc.Server, sac: string, address: string): Promise<string> {
  const emisor = Keypair.random().publicKey();
  const cuenta = new (await import('@stellar/stellar-sdk')).Account(emisor, '0');
  const tx = new TransactionBuilder(cuenta, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(new Contract(sac).call('balance', Address.fromString(address).toScVal()))
    .setTimeout(30)
    .build();
  const simulada = await servidor.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(simulada) || !simulada.result) return '0';
  return String(scValToNative(simulada.result.retval) as bigint);
}

export async function handleRecarga(req: Request, env: RecargaEnv): Promise<Response> {
  if (!env.PEN_SAC_ID || !env.ISSUER_SECRET) {
    return fallo(500, 'INTERNAL', 'La recarga no está configurada en el servidor.');
  }
  const servidor = new rpc.Server(RPC_URL);

  if (req.method === 'GET') {
    const address = new URL(req.url).searchParams.get('address');
    if (!direccionValida(address)) return fallo(400, 'INVALID', 'Falta una cuenta válida.');
    return json({ saldoStroops: await saldoDe(servidor, env.PEN_SAC_ID, address) });
  }

  if (req.method !== 'POST') return fallo(400, 'INVALID', 'Se requiere POST.');

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return fallo(400, 'INVALID', 'El cuerpo debe ser JSON.');
  }
  const datos = cuerpo as { address?: unknown; soles?: unknown };
  if (!direccionValida(datos.address)) return fallo(400, 'INVALID', 'Falta una cuenta válida.');
  const stroops = aStroops(datos.soles);
  if (stroops === null) return fallo(400, 'INVALID', `El monto debe estar entre S/1 y S/${MAX_SOLES}.`);

  try {
    const emisora = Keypair.fromSecret(env.ISSUER_SECRET);
    const cuenta = await servidor.getAccount(emisora.publicKey());
    const tx = new TransactionBuilder(cuenta, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(new Contract(env.PEN_SAC_ID).call(
        'mint',
        Address.fromString(datos.address).toScVal(),
        nativeToScVal(stroops, { type: 'i128' }),
      ))
      .setTimeout(30)
      .build();

    const lista = await servidor.prepareTransaction(tx);
    lista.sign(emisora);
    const enviada = await servidor.sendTransaction(lista);
    if (enviada.status === 'ERROR') return fallo(502, 'INTERNAL', 'No se pudo acreditar el saldo.');
    const final = await servidor.pollTransaction(enviada.hash);
    if (final.status !== 'SUCCESS') return fallo(502, 'INTERNAL', 'No se pudo acreditar el saldo.');

    return json({
      hash: enviada.hash,
      saldoStroops: await saldoDe(servidor, env.PEN_SAC_ID, datos.address),
    });
  } catch {
    return fallo(502, 'INTERNAL', 'No se pudo acreditar el saldo.');
  }
}
