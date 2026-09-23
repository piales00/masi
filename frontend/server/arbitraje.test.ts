import { describe, expect, test } from 'vitest';
import { MAX_BPS, bpsValido, claveCorrecta, handleArbitraje, jobIdValido } from './arbitraje';

const CLAVE = 'clave-del-panel';
const SECRETO = `S${'A'.repeat(55)}`;
const ESCROW = 'CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL';
const COMPLETO = { ESCROW_CONTRACT_ID: ESCROW, ARBITER_SECRET: SECRETO, ARBITER_PANEL_KEY: CLAVE };

function peticion(cuerpo: unknown, clave: string | null = CLAVE, metodo = 'POST'): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (clave !== null) headers['x-masi-arbitraje'] = clave;
  return new Request('https://x/api/arbitraje', {
    method: metodo,
    headers,
    ...(metodo === 'POST' ? { body: JSON.stringify(cuerpo) } : {}),
  });
}

const codigo = async (r: Response) => (await r.json() as { error: { code: string } }).error.code;

describe('validación', () => {
  test('el reparto es un entero entre 0 y 10000', () => {
    for (const valor of [0, 5_000, MAX_BPS]) expect(bpsValido(valor)).toBe(true);
    for (const valor of [-1, MAX_BPS + 1, 1.5, '7000', null, undefined, Number.NaN]) {
      expect(bpsValido(valor)).toBe(false);
    }
  });

  test('el número de trabajo se acepta como número o como cadena', () => {
    expect(jobIdValido(2)).toBe(2n);
    expect(jobIdValido('2')).toBe(2n);
    expect(jobIdValido(' 12 ')).toBe(12n);
    expect(jobIdValido('0')).toBe(0n);
  });

  test('rechaza números de trabajo imposibles', () => {
    for (const valor of [-1, 1.5, 'dos', '', '-3', null, undefined, {}]) {
      expect(jobIdValido(valor)).toBeNull();
    }
  });
});

describe('clave del panel', () => {
  test('acepta la clave exacta y nada más', () => {
    expect(claveCorrecta(CLAVE, CLAVE)).toBe(true);
    expect(claveCorrecta('clave-del-pane', CLAVE)).toBe(false);
    expect(claveCorrecta('clave-del-panelx', CLAVE)).toBe(false);
    expect(claveCorrecta('Clave-del-panel', CLAVE)).toBe(false);
  });

  test('lo que no es una cadena no pasa', () => {
    for (const valor of [null, undefined, 0, {}]) expect(claveCorrecta(valor, CLAVE)).toBe(false);
  });

  test('compara todas las posiciones, no se corta en la primera diferencia', () => {
    // Si parara en la primera diferencia, probar prefijos delataría la clave.
    expect(claveCorrecta('x'.repeat(CLAVE.length), CLAVE)).toBe(false);
    expect(claveCorrecta(`${CLAVE.slice(0, -1)}x`, CLAVE)).toBe(false);
  });
});

describe('autenticación', () => {
  test('sin clave configurada el panel queda cerrado, no abierto', async () => {
    const respuesta = await handleArbitraje(peticion({ jobId: '2', providerBps: 7000 }), {});
    expect(respuesta.status).toBe(500);
  });

  test('sin cabecera responde 401', async () => {
    const respuesta = await handleArbitraje(peticion({ jobId: '2', providerBps: 7000 }, null), COMPLETO);
    expect(respuesta.status).toBe(401);
    expect(await codigo(respuesta)).toBe('NOT_ALLOWED');
  });

  test('con clave equivocada responde 401 y no dice por qué', async () => {
    const respuesta = await handleArbitraje(peticion({ jobId: '2', providerBps: 7000 }, 'otra'), COMPLETO);
    expect(respuesta.status).toBe(401);
    const mensaje = (await respuesta.json() as { error: { message: string } }).error.message;
    expect(mensaje).toBe('No autorizado.');
    expect(mensaje).not.toMatch(/clave|panel|cabecera/i);
  });

  test('la autenticación va antes que cualquier validación del cuerpo', async () => {
    // Un cuerpo inválido sin clave no debe devolver 400: eso confirmaría la ruta.
    const respuesta = await handleArbitraje(peticion({ jobId: 'no', providerBps: 99_999 }, null), COMPLETO);
    expect(respuesta.status).toBe(401);
  });

  test('no filtra si falta ARBITER_SECRET mientras no te identifiques', async () => {
    const sinSecreto = { ESCROW_CONTRACT_ID: ESCROW, ARBITER_PANEL_KEY: CLAVE };
    const respuesta = await handleArbitraje(peticion({ jobId: '2', providerBps: 7000 }, null), sinSecreto);
    expect(respuesta.status).toBe(401);
  });
});

describe('peticiones ya autenticadas', () => {
  test('solo acepta POST', async () => {
    const respuesta = await handleArbitraje(peticion(null, CLAVE, 'GET'), COMPLETO);
    expect(respuesta.status).toBe(400);
  });

  test('un cuerpo que no es JSON responde 400', async () => {
    const respuesta = await handleArbitraje(new Request('https://x/api/arbitraje', {
      method: 'POST', headers: { 'x-masi-arbitraje': CLAVE }, body: 'no soy json',
    }), COMPLETO);
    expect(respuesta.status).toBe(400);
  });

  test('un reparto fuera de rango responde 400 antes de tocar la red', async () => {
    const respuesta = await handleArbitraje(peticion({ jobId: '2', providerBps: MAX_BPS + 1 }), COMPLETO);
    expect(respuesta.status).toBe(400);
    expect(await codigo(respuesta)).toBe('INVALID');
  });

  test('un número de trabajo inválido responde 400', async () => {
    const respuesta = await handleArbitraje(peticion({ jobId: 'dos', providerBps: 7000 }), COMPLETO);
    expect(respuesta.status).toBe(400);
  });

  test('sin ARBITER_SECRET responde 500, ya identificado', async () => {
    const sinSecreto = { ESCROW_CONTRACT_ID: ESCROW, ARBITER_PANEL_KEY: CLAVE };
    const respuesta = await handleArbitraje(peticion({ jobId: '2', providerBps: 7000 }), sinSecreto);
    expect(respuesta.status).toBe(500);
    expect(await codigo(respuesta)).toBe('INTERNAL');
  });

  test('sin contrato configurado tampoco intenta firmar', async () => {
    const sinContrato = { ARBITER_SECRET: SECRETO, ARBITER_PANEL_KEY: CLAVE };
    const respuesta = await handleArbitraje(peticion({ jobId: '2', providerBps: 7000 }), sinContrato);
    expect(respuesta.status).toBe(500);
  });
});
