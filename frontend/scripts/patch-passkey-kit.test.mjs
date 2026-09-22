// @vitest-environment node
import { readFileSync } from 'node:fs';
import { contract, xdr } from '@stellar/stellar-sdk';
import { WalletOwnershipError } from 'passkey-kit';
import { describe, expect, it, vi } from 'vitest';
import { correctedGuard, originalGuard, patchSource } from './patch-passkey-kit.mjs';

const installed = readFileSync(new URL('../node_modules/passkey-kit/dist/kit.js', import.meta.url), 'utf8');
const unpatched = installed.replace(correctedGuard, originalGuard);
const patched = patchSource(unpatched);

// Execute the actual expiry branch from the installed kit, not a reimplementation.
function checkExpiration(source, expiration, closeTime = '100') {
  const start = source.indexOf('const expiration = signerVal.values[1][0];');
  const end = source.indexOf('if (!rawResponse || !authenticationChallenge)', start);
  if (start < 0 || end < start) throw new Error('Could not locate connectWallet expiration branch');
  const branch = source.slice(start, end);
  const execute = new Function('signerVal', 'WalletOwnershipError', `return (async () => {
    let lastMismatch;
    let signerExpirationLedger;
    const candidate = { contractId: 'C_TEST' };
    const keyIdBase64 = 'test-key';
    for (const attempt of [0]) {
      ${branch}
    }
    if (lastMismatch) throw lastMismatch;
    return true;
  })();`);
  const rpc = { getLatestLedger: vi.fn().mockResolvedValue({ closeTime }) };
  return { result: execute.call({ rpc }, { values: [new Uint8Array(), [expiration]] }, WalletOwnershipError), rpc };
}

describe('passkey-kit 0.19.1: compatibilidad de vencimiento', () => {
  it('reproduce el error real con Option::None decodificado por Stellar', async () => {
    const option = xdr.ScSpecTypeDef.scSpecTypeOption(new xdr.ScSpecTypeOption({ valueType: xdr.ScSpecTypeDef.scSpecTypeU64() }));
    const expiration = contract.Spec.prototype.scValToNative.call({}, xdr.ScVal.scvVoid(), option);
    expect(expiration).toBeNull();
    await expect(checkExpiration(unpatched, expiration).result).rejects.toThrow("Cannot read properties of null (reading 'toString')");
  });
  it.each([null, undefined])('acepta sin vencimiento (%s), sin consultar una fecha innecesaria', async expiration => {
    const { result, rpc } = checkExpiration(patched, expiration);
    await expect(result).resolves.toBe(true);
    expect(rpc.getLatestLedger).not.toHaveBeenCalled();
  });
  it.each([0n, 99n])('continúa rechazando vencimientos pasados (%s)', async expiration => {
    await expect(checkExpiration(patched, expiration).result).rejects.toThrow('signer is expired');
  });
  it.each([100n, 101n])('acepta fechas vigentes (%s)', async expiration => {
    await expect(checkExpiration(patched, expiration).result).resolves.toBe(true);
  });
  it('rechaza una fecha de ledger inválida', async () => {
    await expect(checkExpiration(patched, 101n, 'invalid').result).rejects.toThrow('invalid close timestamp');
  });
  it('es idempotente y solo cambia la comprobación de null', () => {
    expect(patchSource(patched)).toBe(patched);
    expect(patched.replace(correctedGuard, originalGuard)).toBe(unpatched);
    expect(patched).toContain('await this.assertSignerProvenance(');
    expect(patched).toContain('await this.assertWalletWasmHash(');
  });
  it('falla explícitamente si cambia el código esperado de la dependencia', () => {
    expect(() => patchSource('different dependency')).toThrow('review');
  });
});
