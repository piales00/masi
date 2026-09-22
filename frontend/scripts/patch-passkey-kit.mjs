import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// passkey-kit 0.19.1 expects undefined for Option::None, while stellar-sdk
// 16.3.0 decodes it as null. Only change that guard, never skip ownership proofs.
export const originalGuard = 'const expiration = signerVal.values[1][0];\n                if (expiration !== undefined) {';
export const correctedGuard = 'const expiration = signerVal.values[1][0];\n                if (expiration !== undefined && expiration !== null) {';

export function patchSource(source) {
  if (source.split(correctedGuard).length === 2 && !source.includes(originalGuard)) return source;
  if (source.split(originalGuard).length !== 2 || source.includes(correctedGuard)) {
    throw new Error('passkey-kit changed: review the expiration compatibility patch before building.');
  }
  return source.replace(originalGuard, correctedGuard);
}

export function applyPatch() {
  const packageRoot = new URL('../node_modules/passkey-kit/', import.meta.url);
  const metadata = JSON.parse(readFileSync(new URL('package.json', packageRoot), 'utf8'));
  if (metadata.version !== '0.19.1') {
    throw new Error('Review/remove the expiration compatibility patch when updating passkey-kit.');
  }
  const path = new URL('dist/kit.js', packageRoot);
  const source = readFileSync(path, 'utf8');
  const patched = patchSource(source);
  if (patched !== source) writeFileSync(path, patched);
  console.log('passkey-kit 0.19.1: null expiration compatibility verified.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) applyPatch();
