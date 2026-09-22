import { describe, expect, test } from 'vitest';
import { MAX_SOLES, aStroops, direccionValida, handleRecarga } from './recarga';

describe('recarga simulada', () => {
  test('convierte soles a stroops con dos decimales', () => {
    expect(aStroops(1)).toBe(10_000_000n);
    expect(aStroops(1200)).toBe(12_000_000_000n);
    expect(aStroops(12.35)).toBe(123_500_000n);
  });

  test('rechaza montos imposibles', () => {
    for (const valor of [0, -5, MAX_SOLES + 1, 1.234, Number.NaN, '100', null, undefined]) {
      expect(aStroops(valor)).toBeNull();
    }
  });

  test('solo acepta direcciones de contrato', () => {
    expect(direccionValida('CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL')).toBe(true);
    // Una cuenta clásica G no es una wallet de Masi.
    expect(direccionValida('GBGZZ3XKNJSMX3MNXB2J26WVV76ZJAKKOH2C35ZF5G4W2COZAMC7I77C')).toBe(false);
    expect(direccionValida('hola')).toBe(false);
  });

  test('sin configuración en el servidor responde 500 y no intenta nada', async () => {
    const respuesta = await handleRecarga(new Request('https://x/api/recarga', { method: 'POST' }), {});
    expect(respuesta.status).toBe(500);
  });

  test('con una dirección inválida responde 400 antes de tocar la red', async () => {
    const env = { PEN_SAC_ID: 'CBRGYUR2HARSELLPQV4THEERTJCCGLGBPDR6FIXHY5MZ5LB3D4ISPSCC', ISSUER_SECRET: 'S'.padEnd(56, 'A') };
    const respuesta = await handleRecarga(new Request('https://x/api/recarga', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: 'no', soles: 100 }),
    }), env);
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json() as { error: { code: string } }).error.code).toBe('INVALID');
  });
})
