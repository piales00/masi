import { describe, expect, it } from 'vitest';
import { requirePasskeyOrigin } from './passkeyOrigin';

describe('dominios estables de passkeys', () => {
  it.each([
    'https://masiapp-nine.vercel.app',
    'https://masiapp.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ])('acepta %s', origin => {
    expect(() => requirePasskeyOrigin(origin)).not.toThrow();
  });
  it.each([
    'http://masiapp-nine.vercel.app',
    'https://masiapp-nine-git-preview.vercel.app',
    'https://masiapp-nine.vercel.app.example.com',
    'https://example.com',
  ])('rechaza %s', origin => {
    expect(() => requirePasskeyOrigin(origin)).toThrow('Abre masiapp-nine.vercel.app');
  });
});
