import { describe, expect, it } from 'vitest';
import { hayConfiguracion } from './redisStore';

describe('configuración de Upstash', () => {
  it('acepta los nombres que inyecta la integración de Vercel', () => {
    expect(hayConfiguracion({ KV_REST_API_URL: 'https://x', KV_REST_API_TOKEN: 't' })).toBe(true);
  });

  it('acepta los nombres de una instalación manual', () => {
    expect(hayConfiguracion({ UPSTASH_REDIS_REST_URL: 'https://x', UPSTASH_REDIS_REST_TOKEN: 't' })).toBe(true);
  });

  it('con la URL pero sin token no da por buena la configuración', () => {
    expect(hayConfiguracion({ KV_REST_API_URL: 'https://x' })).toBe(false);
  });

  it('sin nada, no', () => {
    expect(hayConfiguracion({})).toBe(false);
  });
});
