import { Buffer } from 'buffer';
import { MercuryIndexer, PasskeyKit, SignerKey } from 'passkey-kit';
import type { CreateWalletResult } from 'passkey-kit';
import { IndexedDBStorage } from 'passkey-kit/storage';

// passkey-kit and stellar-sdk use Buffer while constructing Stellar XDR.
(globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer ??= Buffer;

const networkPassphrase = 'Test SDF Network ; September 2015';
const kit = new PasskeyKit({
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase,
  walletWasmHash: '97ce047884106b1c6c3bb40b8973cc48db1c4dad95c9e20462bf2c701daa764e',
  storage: new IndexedDBStorage(),
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

function savePending(value: Pending): void {
  localStorage.setItem(pendingKey, JSON.stringify(value));
}

export function requireFinalDomain(): void {
  if (location.origin === 'https://masiapp.vercel.app') return;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
  throw new Error('Abre masiapp.vercel.app para crear o ingresar a tu cuenta.');
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
    keyId: Uint8Array.from(Buffer.from(pending.keyIdBase64, 'base64url')),
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

export async function signIn(): Promise<string> {
  requireFinalDomain();
  const connected = await kit.connectWallet({
    getWalletCandidates: async keyId => {
      if (!indexer) throw new Error('No está disponible la búsqueda de cuentas.');
      return indexer.findWallets(SignerKey.Secp256r1(keyId));
    },
  });
  return connected.contractId;
}
