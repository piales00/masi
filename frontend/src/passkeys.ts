import { Buffer } from 'buffer';
import { MercuryIndexer, PasskeyKit, SignerKey } from 'passkey-kit';
import type { CreateWalletResult } from 'passkey-kit';
import type { AssembledTransaction } from '@stellar/stellar-sdk/contract';
import type { xdr } from '@stellar/stellar-sdk';
import { IndexedDBStorage } from 'passkey-kit/storage';
import { requirePasskeyOrigin } from './passkeyOrigin';
import { verifiedWebAuthn } from './verifiedWebAuthn';

// passkey-kit and stellar-sdk use Buffer while constructing Stellar XDR.
(globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer ??= Buffer;

const networkPassphrase = 'Test SDF Network ; September 2015';
const kit = new PasskeyKit({
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase,
  walletWasmHash: '97ce047884106b1c6c3bb40b8973cc48db1c4dad95c9e20462bf2c701daa764e',
  storage: new IndexedDBStorage(),
  requireUserVerification: true,
  WebAuthn: verifiedWebAuthn,
});
const indexer = MercuryIndexer.forNetwork({ rpc: kit.rpc }, networkPassphrase);
const pendingKey = 'masi.passkey.pending.v1';

type Pending = {
  userName: string;
  rawResponse: CreateWalletResult['rawResponse'];
  keyIdBase64: string;
  publicKeyBase64: string;
  contractId: string;
  signedTx: string;
  hash?: string;
};

export type AccountReceipt = { contractId: string; hash: string; confirmed: boolean };

function getPending(): Pending | null {
  try {
    const value = localStorage.getItem(pendingKey);
    return value ? JSON.parse(value) as Pending : null;
  } catch {
    return null;
  }
}

export function hasPendingAccount(): boolean {
  return getPending() !== null;
}

export function pendingAccountName(): string | null {
  return getPending()?.userName ?? null;
}

function savePending(value: Pending): void {
  localStorage.setItem(pendingKey, JSON.stringify(value));
}

export function requireFinalDomain(): void {
  requirePasskeyOrigin(location.origin);
}

export async function createAccount(userName: string): Promise<AccountReceipt> {
  requireFinalDomain();
  const existing = getPending();
  if (existing) {
    if (existing.userName !== userName) {
      throw new Error(`Hay un registro pendiente de ${existing.userName}. Termínalo antes de crear otra cuenta en este navegador.`);
    }
    return resumeAccountCreation();
  }

  const created = await kit.createWallet('Masi', userName);
  savePending({
    userName,
    rawResponse: created.rawResponse,
    keyIdBase64: created.keyIdBase64,
    publicKeyBase64: Buffer.from(created.publicKey).toString('base64'),
    contractId: created.contractId,
    signedTx: created.signedTx,
  });
  return resumeAccountCreation();
}

export async function resumeAccountCreation(): Promise<AccountReceipt> {
  requireFinalDomain();
  const pending = getPending();
  if (!pending) throw new Error('No hay un registro pendiente.');

  if (!pending.hash) {
    const response = await fetch('/api/relayer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ xdr: pending.signedTx }),
    });
    const result = await response.json() as { hash?: string; error?: { message?: string } };
    if (!response.ok || !result.hash) {
      throw new Error(result.error?.message || 'No se pudo registrar la cuenta. Reintenta el envío de este mismo registro.');
    }
    pending.hash = result.hash;
    savePending(pending);
  }

  const created: CreateWalletResult = {
    rawResponse: pending.rawResponse,
    // Browser Buffer does not support the 'base64url' encoding label.
    // Normalize the URL-safe alphabet; base64 decoding also accepts omitted padding.
    keyId: Uint8Array.from(Buffer.from(pending.keyIdBase64.replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
    keyIdBase64: pending.keyIdBase64,
    publicKey: Uint8Array.from(Buffer.from(pending.publicKeyBase64, 'base64')),
    contractId: pending.contractId,
    signedTx: pending.signedTx,
  };
  try {
    await kit.confirmWalletCreation(created, pending.hash);
    localStorage.removeItem(pendingKey);
    return { contractId: pending.contractId, hash: pending.hash, confirmed: true };
  } catch {
    // A successful relayer receipt means deployment happened. Keep the record so
    // confirmation can be retried without creating another passkey or account.
    return { contractId: pending.contractId, hash: pending.hash, confirmed: false };
  }
}

async function connectVerifiedAccount(): Promise<string> {
  requireFinalDomain();
  const connected = await kit.connectWallet({
    getWalletCandidates: async keyId => {
      if (!indexer) throw new Error('No está disponible la búsqueda de cuentas.');
      return indexer.findWallets(SignerKey.Secp256r1(keyId));
    },
  });
  return connected.contractId;
}

export async function signIn(): Promise<string> {
  const contractId = await connectVerifiedAccount();
  try {
    const key = `masi.logins.${contractId}`;
    const saved: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    const dates = Array.isArray(saved) ? saved.filter(item => typeof item === 'string') : [];
    localStorage.setItem(key, JSON.stringify([new Date().toISOString(), ...dates].slice(0, 10)));
  } catch { /* El historial local no debe impedir un acceso válido. */ }
  return contractId;
}

/** Reautenticación de la demo: no firma ni envía transacciones de pago. */
export async function confirmDemoIdentity(expectedContractId: string | undefined): Promise<void> {
  if (!expectedContractId) throw new Error('HostError: Error(Contract, #5)');
  const actual = await connectVerifiedAccount();
  if (actual !== expectedContractId) throw new Error('HostError: Error(Contract, #5)');
}

/** Dirección `C…` de la cuenta conectada en esta pestaña, si la hay. */
export function connectedAddress(): string | undefined {
  return kit.contractId;
}

/**
 * Firma una llamada al contrato con la huella y la envía por `/api/relayer`.
 *
 * El relayer paga la comisión, así que el usuario nunca necesita XLM. `PasskeyServer.send`
 * reconoce una sola operación `invokeHostFunction` sin firma de la cuenta fuente y la manda
 * por la vía `{ func, auth }` de Channels, que es la documentada por Stellar.
 *
 * Solo vuelve a pedir la huella para reconectar si la cuenta no es la esperada: la firma en sí
 * ya es una ceremonia, y encadenar dos seguidas se siente como un trámite repetido.
 */
export async function signAndSend<T>(tx: AssembledTransaction<T>, expectedAddress: string): Promise<string> {
  requireFinalDomain();
  if (kit.contractId !== expectedAddress) await confirmDemoIdentity(expectedAddress);
  await kit.sign(tx);
  const xdr = tx.built?.toXDR();
  if (!xdr) throw new Error('La transacción no llegó a construirse.');

  const response = await fetch('/api/relayer', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ xdr }),
  });
  const result = await response.json() as { hash?: string; error?: { message?: string } };
  if (!response.ok || !result.hash) {
    throw new Error(result.error?.message || 'No se pudo enviar la transacción. Inténtalo de nuevo.');
  }
  return result.hash;
}

/**
 * Firma una entrada de autorización suelta, sin transacción alrededor. Es lo que pide
 * SEP-45 para identificarse ante un anchor: la huella prueba que la smart wallet es tuya.
 *
 * `expiracion` viene del propio reto, para que la firma caduque a la vez que la del anchor.
 */
export async function signAuthEntry(
  entrada: xdr.SorobanAuthorizationEntry,
  expectedAddress: string,
  expiracion: number,
): Promise<xdr.SorobanAuthorizationEntry> {
  requireFinalDomain();
  if (kit.contractId !== expectedAddress) await confirmDemoIdentity(expectedAddress);
  return kit.signAuthEntry(entrada, undefined, { expiration: expiracion });
}
