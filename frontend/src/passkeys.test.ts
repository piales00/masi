import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Buffer } from 'buffer';
import { createAccount, hasPendingAccount, resumeAccountCreation, confirmDemoIdentity, signIn } from './passkeys';

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
  it('exige una comprobación nueva en cada acción simulada', async () => {
    kit.connectWallet.mockResolvedValue({ contractId: 'C_TEST' });
    await confirmDemoIdentity('C_TEST');
    await confirmDemoIdentity('C_TEST');
    expect(kit.connectWallet).toHaveBeenCalledTimes(2);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rechaza otra cuenta, ausencia de sesión y cancelación', async () => {
    await expect(confirmDemoIdentity(undefined)).rejects.toThrow('#5');
    expect(kit.connectWallet).not.toHaveBeenCalled();
    kit.connectWallet.mockResolvedValue({ contractId: 'C_OTHER' });
    await expect(confirmDemoIdentity('C_TEST')).rejects.toThrow('#5');
    kit.connectWallet.mockRejectedValue(new DOMException('Cancelado', 'NotAllowedError'));
    await expect(confirmDemoIdentity('C_TEST')).rejects.toThrow('Cancelado');
  });

  it('guarda solo los diez accesos correctos de cada cuenta, no las confirmaciones de pedidos', async () => {
    kit.connectWallet.mockResolvedValue({ contractId: 'C_TEST' });
    for (let i = 0; i < 12; i++) await signIn();
    expect(JSON.parse(localStorage.getItem('masi.logins.C_TEST')!)).toHaveLength(10);
    const previous = localStorage.getItem('masi.logins.C_TEST');
    await confirmDemoIdentity('C_TEST');
    expect(localStorage.getItem('masi.logins.C_TEST')).toBe(previous);
    kit.connectWallet.mockRejectedValue(new Error('Cancelado'));
    await expect(signIn()).rejects.toThrow();
    expect(localStorage.getItem('masi.logins.C_TEST')).toBe(previous);
  });
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
