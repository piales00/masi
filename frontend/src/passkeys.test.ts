import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Buffer } from 'buffer';
import { createAccount, hasPendingAccount, resumeAccountCreation } from './passkeys';

// Use the browser polyfill, not Node's built-in Buffer, to catch browser-only bugs.
vi.mock('buffer', () => vi.importActual('buffer/'));
const kit = vi.hoisted(() => ({
  createWallet: vi.fn(), confirmWalletCreation: vi.fn(), connectWallet: vi.fn(),
}));
vi.mock('passkey-kit', () => ({
  PasskeyKit: class { constructor() { return kit; } },
  MercuryIndexer: { forNetwork: () => null },
  SignerKey: {},
}));
vi.mock('passkey-kit/storage', () => ({ IndexedDBStorage: class {} }));

const pendingKey = 'masi.passkey.pending.v1';
function savePending(keyIdBase64 = '-_8', hash: string | undefined = 'existing-hash') {
  localStorage.setItem(pendingKey, JSON.stringify({
    userName: 'Cuenta de prueba', rawResponse: {}, keyIdBase64,
    publicKeyBase64: 'AQID', contractId: 'C_TEST', signedTx: 'saved-xdr', hash,
  }));
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
  kit.confirmWalletCreation.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe('recuperación del registro con Buffer del navegador', () => {
  it('reproduce la incompatibilidad del polyfill con base64url', () => {
    expect(() => Buffer.from('-_8', 'base64url')).toThrow('Unknown encoding: base64url');
  });

  it.each(['-_8', '-_8='])('recupera una llave %s sin crear ni enviar otra cuenta', async encoded => {
    savePending(encoded);
    const receipt = await createAccount('Cuenta de prueba');
    expect(receipt).toEqual({ contractId: 'C_TEST', hash: 'existing-hash', confirmed: true });
    const [created, hash] = kit.confirmWalletCreation.mock.calls[0];
    expect(Array.from(created.keyId)).toEqual([251, 255]);
    expect(created.keyIdBase64).toBe(encoded);
    expect(Array.from(created.publicKey)).toEqual([1, 2, 3]);
    expect(hash).toBe('existing-hash');
    expect(kit.createWallet).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(hasPendingAccount()).toBe(false);
  });

  it('conserva el registro si la confirmación todavía falla', async () => {
    savePending();
    kit.confirmWalletCreation.mockRejectedValue(new Error('Todavía no confirmado'));
    expect((await resumeAccountCreation()).confirmed).toBe(false);
    expect(hasPendingAccount()).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('guarda el hash del relayer antes de confirmar', async () => {
    savePending('-_8', undefined);
    // Omit the hash explicitly: the helper defaults it for already-sent accounts.
    const pending = JSON.parse(localStorage.getItem(pendingKey)!);
    delete pending.hash;
    localStorage.setItem(pendingKey, JSON.stringify(pending));
    vi.mocked(fetch).mockResolvedValue(Response.json({ hash: 'new-hash' }));
    expect((await resumeAccountCreation()).hash).toBe('new-hash');
    expect(fetch).toHaveBeenCalledOnce();
    expect(kit.confirmWalletCreation).toHaveBeenCalledOnce();
  });
});
