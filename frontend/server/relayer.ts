import { Address, TransactionBuilder } from '@stellar/stellar-sdk';
import { PasskeyServer } from 'passkey-kit/server';
import type { ApiError } from '../../shared/api.js';

const networkPassphrase = 'Test SDF Network ; September 2015';

export interface RelayerEnv {
  RELAYER_API_KEY?: string;
  RELAYER_BASE_URL?: string;
  ESCROW_CONTRACT_ID?: string;
  PEN_SAC_ID?: string;
  WALLET_WASM_HASH?: string;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

function failure(status: number, code: ApiError['error']['code'], message: string): Response {
  return json({ error: { code, message } } satisfies ApiError, status);
}

function requiredEnv(env: RelayerEnv): env is Required<RelayerEnv> {
  return Boolean(env.RELAYER_API_KEY && env.RELAYER_BASE_URL && env.ESCROW_CONTRACT_ID &&
    env.PEN_SAC_ID && env.WALLET_WASM_HASH && /^[0-9a-f]{64}$/.test(env.WALLET_WASM_HASH));
}

export function transactionAllowed(xdr: string, env: Required<RelayerEnv>): boolean {
  const transaction = TransactionBuilder.fromXDR(xdr, networkPassphrase);
  if (transaction.operations.length !== 1) return false;
  const operation = transaction.operations[0];
  if (operation.type !== 'invokeHostFunction') return false;
  const kind = operation.func.switch().name;
  if (kind === 'hostFunctionTypeCreateContractV2') {
    const executable = operation.func.createContractV2().executable();
    return executable.switch().name === 'contractExecutableWasm' &&
      Buffer.from(executable.wasmHash()).toString('hex') === env.WALLET_WASM_HASH;
  }
  if (kind === 'hostFunctionTypeInvokeContract') {
    const contractId = Address.fromScAddress(operation.func.invokeContract().contractAddress()).toString();
    return contractId === env.ESCROW_CONTRACT_ID || contractId === env.PEN_SAC_ID;
  }
  return false;
}

export async function handleRelayer(req: Request, env: RelayerEnv): Promise<Response> {
  if (req.method !== 'POST') return failure(400, 'INVALID', 'Se requiere POST.');
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return failure(400, 'INVALID', 'El cuerpo debe ser JSON.');
  }
  const xdr = typeof body === 'object' && body !== null && !Array.isArray(body) &&
    typeof (body as Record<string, unknown>).xdr === 'string'
    ? (body as Record<string, string>).xdr
    : null;
  if (!xdr || xdr.length > 250_000) return failure(400, 'INVALID', 'Falta una transacción XDR válida.');
  if (!requiredEnv(env)) return failure(500, 'INTERNAL', 'El relayer no está configurado.');

  try {
    if (!transactionAllowed(xdr, env)) {
      return failure(403, 'NOT_ALLOWED', 'La transacción está fuera de la lista blanca.');
    }
  } catch {
    return failure(400, 'INVALID', 'No se pudo decodificar la transacción XDR.');
  }

  try {
    const server = new PasskeyServer({
      networkPassphrase,
      rpcUrl: 'https://soroban-testnet.stellar.org',
      relayer: { baseUrl: env.RELAYER_BASE_URL, apiKey: env.RELAYER_API_KEY },
    });
    const result = await server.send(xdr);
    if (!result.success) return failure(502, 'RELAYER', result.error.message);
    return json({ hash: result.hash });
  } catch {
    return failure(502, 'RELAYER', 'No se pudo contactar con el relayer.');
  }
}
