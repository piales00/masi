import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { describe, expect, test } from 'vitest';
import { handleRelayer, transactionAllowed, type RelayerEnv } from './relayer';

const fullEnv = {
  RELAYER_API_KEY: 'test-only',
  RELAYER_BASE_URL: 'https://channels.openzeppelin.com/testnet',
  ESCROW_CONTRACT_ID: 'CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL',
  PEN_SAC_ID: 'CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC',
  WALLET_WASM_HASH: '97ce047884106b1c6c3bb40b8973cc48db1c4dad95c9e20462bf2c701daa764e',
} satisfies Required<RelayerEnv>;
const otherContract = 'CDBZRR356DZUXA66KP4FBL77ZVFYGQ7LYM3KFW5Q2OV352CV3BXYF3XV';
const source = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

function transaction(operation: ReturnType<Contract['call']>): string {
  return new TransactionBuilder(new Account(source, '1'), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  }).addOperation(operation).setTimeout(30).build().toXDR();
}

function invoke(contractId: string): string {
  return transaction(new Contract(contractId).call('balance'));
}

function deploy(hash = fullEnv.WALLET_WASM_HASH): string {
  return transaction(Operation.createCustomContract({
    address: Address.fromString(source),
    wasmHash: Buffer.from(hash, 'hex'),
    salt: Buffer.alloc(32, 7),
    constructorArgs: [],
  }));
}

describe('relayer', () => {
  test('rechaza xdr ausente o ilegible', async () => {
    const missing = await handleRelayer(new Request('https://masiapp.vercel.app/api/relayer', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    }), fullEnv);
    expect(missing.status).toBe(400);
    expect(await missing.json()).toMatchObject({ error: { code: 'INVALID' } });

    const invalid = await handleRelayer(new Request('https://masiapp.vercel.app/api/relayer', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ xdr: 'no-es-xdr' }),
    }), fullEnv);
    expect(invalid.status).toBe(400);
  });

  test('rechaza contratos fuera de la lista blanca', async () => {
    const result = await handleRelayer(new Request('https://masiapp.vercel.app/api/relayer', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ xdr: invoke(otherContract) }),
    }), fullEnv);
    expect(result.status).toBe(403);
    expect(await result.json()).toMatchObject({ error: { code: 'NOT_ALLOWED' } });
  });

  test('la lista blanca admite escrow, SAC y solo el WASM de wallet configurado', () => {
    expect(transactionAllowed(invoke(fullEnv.ESCROW_CONTRACT_ID), fullEnv)).toBe(true);
    expect(transactionAllowed(invoke(fullEnv.PEN_SAC_ID), fullEnv)).toBe(true);
    expect(transactionAllowed(deploy(), fullEnv)).toBe(true);
    expect(transactionAllowed(invoke(otherContract), fullEnv)).toBe(false);
    expect(transactionAllowed(deploy('0'.repeat(64)), fullEnv)).toBe(false);
  });
});
