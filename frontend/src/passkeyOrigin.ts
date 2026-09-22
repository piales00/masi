// Dominios estables autorizados. Cada origen conserva sus propias passkeys.
export const PASSKEY_ORIGINS = [
  'https://masiapp-nine.vercel.app',
  'https://masiapp.vercel.app',
] as const;

export function requirePasskeyOrigin(origin: string): void {
  const url = new URL(origin);
  if (PASSKEY_ORIGINS.some(allowed => allowed === url.origin)) return;
  if ((url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return;
  throw new Error('Abre masiapp-nine.vercel.app o el sitio del equipo masiapp.vercel.app para crear o ingresar a tu cuenta.');
}
