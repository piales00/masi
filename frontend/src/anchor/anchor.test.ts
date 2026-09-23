import { describe, expect, it, vi } from 'vitest';
import { Address, xdr } from '@stellar/stellar-sdk';
import { codificarEntradas, decodificarEntradas } from './entradas';
import { parsearToml } from './sep1';
import { RETIRO_NO_DISPONIBLE, explicarFallo, obtenerToken, verificarReto, type FirmarEntrada } from './sep45';
import { activosDeRetiro, consultarRetiro, iniciarRetiro } from './sep24';
import reto from './fixtures/reto.json';
import TOML from './fixtures/stellar.toml.txt?raw';

/**
 * Los datos son capturas reales del anchor de referencia de Stellar
 * (testanchor.stellar.org). Si el formato del reto cambia, estas pruebas lo dicen.
 */
const CUENTA = 'CC7TK7EBJT46ECHSE726ALGNVGNTHSHJA65BCGRCLS7E4UQ5TPYMMXKO';
const ESPERADO = {
  cuenta: CUENTA,
  homeDomain: 'testanchor.stellar.org',
  webAuthDomain: 'testanchor.stellar.org',
  contratoAuth: 'CD3LA6RKF5D2FN2R2L57MWXLBRSEWWENE74YBEFZSSGNJRJGICFGQXMX',
  signingKey: 'GCHLHDBOKG2JWMJQBTLSL5XG6NO7ESXI2TAQKZXCXWXB5WI2X6W233PR',
};

describe('SEP-1: stellar.toml', () => {
  it('encuentra los puntos de entrada del anchor real', () => {
    const info = parsearToml(TOML);
    expect(info.webAuthContratoEndpoint).toBe('https://testanchor.stellar.org/sep45/auth');
    expect(info.webAuthContratoId).toBe(ESPERADO.contratoAuth);
    expect(info.transferServerSep24).toBe('https://testanchor.stellar.org/sep24');
    expect(info.signingKey).toBe(ESPERADO.signingKey);
  });

  it('lee las monedas, que van en minúsculas dentro de su bloque', () => {
    const info = parsearToml(TOML);
    expect(info.monedas.map(m => m.code)).toEqual(['SRT', 'USDC', 'native']);
    expect(info.monedas[0].issuer).toBe('GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B');
  });

  it('no confunde una clave de la cabecera con una de moneda', () => {
    const info = parsearToml('SIGNING_KEY = "GABC"\n\n[[CURRENCIES]]\ncode = "PEN"\n\n[DOCUMENTATION]\nORG_NAME = "X"\n');
    expect(info.signingKey).toBe('GABC');
    expect(info.monedas).toEqual([{ code: 'PEN' }]);
  });

  it('ignora los comentarios', () => {
    expect(parsearToml('# SIGNING_KEY = "MALA"\nSIGNING_KEY = "BUENA"').signingKey).toBe('BUENA');
  });
});

describe('entradas de autorización', () => {
  it('la ida y vuelta del array XDR es idéntica byte a byte', () => {
    expect(codificarEntradas(decodificarEntradas(reto.authorizationEntries))).toBe(reto.authorizationEntries);
  });
});

describe('SEP-45: verificación del reto', () => {
  it('acepta el reto real y señala cuál nos toca firmar', () => {
    const { entradas, indicePropio, expiracion } = verificarReto(reto.authorizationEntries, ESPERADO);
    expect(entradas).toHaveLength(2);
    const nuestra = entradas[indicePropio].credentials().address();
    expect(Address.fromScAddress(nuestra.address()).toString()).toBe(CUENTA);
    expect(nuestra.signature().switch().name).toBe('scvVoid');
    expect(expiracion).toBeGreaterThan(0);
  });

  it('rechaza un reto emitido para otra cuenta', () => {
    const otra = { ...ESPERADO, cuenta: 'CDSPVAOAQIYVQWS7JSTTXKRCZLJGSKMZJDCHRI6I2FIJA3NQMIJQL5PP' };
    expect(() => verificarReto(reto.authorizationEntries, otra)).toThrow(/otra cuenta/);
  });

  it('rechaza un reto de otro dominio', () => {
    expect(() => verificarReto(reto.authorizationEntries, { ...ESPERADO, homeDomain: 'malo.example' }))
      .toThrow(/otro dominio/);
  });

  it('rechaza un reto que apunta a otro contrato de autenticación', () => {
    const otro = { ...ESPERADO, contratoAuth: 'CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL' };
    expect(() => verificarReto(reto.authorizationEntries, otro)).toThrow(/otro contrato/);
  });

  it('rechaza un reto que no viene firmado por el anchor', () => {
    expect(() => verificarReto(reto.authorizationEntries, { ...ESPERADO, signingKey: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' }))
      .toThrow(/firmado por el anchor/);
  });

  it('rechaza un reto con una sola entrada', () => {
    const [primera] = decodificarEntradas(reto.authorizationEntries);
    expect(() => verificarReto(codificarEntradas([primera]), ESPERADO)).toThrow(/incompleto/);
  });

  it('rechaza si nuestra entrada ya viniera firmada', () => {
    const entradas = decodificarEntradas(reto.authorizationEntries);
    const propia = entradas.find(e => Address.fromScAddress(e.credentials().address().address()).toString() === CUENTA)!;
    const ajena = entradas.find(e => e !== propia)!;
    propia.credentials().address().signature(ajena.credentials().address().signature());
    expect(() => verificarReto(codificarEntradas(entradas), ESPERADO)).toThrow(/ya venía firmada/);
  });
});

describe('SEP-45: canje por el token', () => {
  const firmaFalsa: FirmarEntrada = (entrada: xdr.SorobanAuthorizationEntry, _expiracion: number) => {
    entrada.credentials().address().signatureExpirationLedger(999);
    return Promise.resolve(entrada);
  };

  it('verifica, firma solo la entrada propia y canjea el token', async () => {
    const llamadas: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      llamadas.push({ url: String(url), init });
      const cuerpo = llamadas.length === 1 ? reto : { token: 'jwt-de-prueba' };
      return new Response(JSON.stringify(cuerpo), { status: 200 });
    }) as unknown as typeof fetch;

    const firmar = vi.fn(firmaFalsa);
    const token = await obtenerToken(
      { ...ESPERADO, endpoint: 'https://testanchor.stellar.org/sep45/auth', fetchImpl },
      firmar,
    );

    expect(token).toBe('jwt-de-prueba');
    expect(llamadas[0].url).toContain(`account=${CUENTA}`);
    expect(llamadas[0].url).toContain('home_domain=testanchor.stellar.org');

    // Solo se firma una entrada, y se manda con la clave que espera el anchor.
    expect(firmar).toHaveBeenCalledTimes(1);
    // Las dos grafías: el estándar dice snake_case y el anchor de referencia lee camelCase.
    const enviado = JSON.parse(String(llamadas[1].init?.body)) as Record<string, string>;
    expect(Object.keys(enviado).sort()).toEqual(['authorizationEntries', 'authorization_entries']);
    expect(enviado.authorizationEntries).toBe(enviado.authorization_entries);
    const devueltas = decodificarEntradas(enviado.authorization_entries);
    expect(devueltas).toHaveLength(2);
    const propia = devueltas.find(e => Address.fromScAddress(e.credentials().address().address()).toString() === CUENTA)!;
    expect(propia.credentials().address().signatureExpirationLedger()).toBe(999);
  });

  it('usa la caducidad del anchor para la firma propia', async () => {
    const { expiracion } = verificarReto(reto.authorizationEntries, ESPERADO);
    const fetchImpl = vi.fn(async (_u: unknown, init?: RequestInit) =>
      new Response(JSON.stringify(init ? { token: 't' } : reto), { status: 200 })) as unknown as typeof fetch;
    const firmar = vi.fn(firmaFalsa);
    await obtenerToken({ ...ESPERADO, endpoint: 'https://x/auth', fetchImpl }, firmar);
    expect(firmar.mock.calls[0][1]).toBe(expiracion);
  });

  it('no firma nada si el reto no cuadra', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(reto), { status: 200 })) as unknown as typeof fetch;
    const firmar = vi.fn(firmaFalsa);
    await expect(obtenerToken({ ...ESPERADO, cuenta: 'CDSPVAOAQIYVQWS7JSTTXKRCZLJGSKMZJDCHRI6I2FIJA3NQMIJQL5PP', endpoint: 'https://x/auth', fetchImpl }, firmar))
      .rejects.toThrow(/otra cuenta/);
    expect(firmar).not.toHaveBeenCalled();
  });

  it('explica el fallo cuando el anchor rechaza la firma', async () => {
    const fetchImpl = vi.fn(async (_u: unknown, init?: RequestInit) => init
      ? new Response(JSON.stringify({ error: 'Failed to simulate transaction' }), { status: 400 })
      : new Response(JSON.stringify(reto), { status: 200 })) as unknown as typeof fetch;
    await expect(obtenerToken({ ...ESPERADO, endpoint: 'https://x/auth', fetchImpl }, firmaFalsa))
      .rejects.toThrow('Failed to simulate transaction');
  });
});

describe('SEP-24', () => {
  const SERVIDOR = 'https://testanchor.stellar.org/sep24';

  it('lista solo los activos con retiro habilitado', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      withdraw: { SRT: { enabled: true }, USDC: { enabled: true }, XYZ: { enabled: false } },
    }), { status: 200 })) as unknown as typeof fetch;
    expect(await activosDeRetiro(SERVIDOR, fetchImpl)).toEqual(['SRT', 'USDC']);
  });

  it('pide la ventana interactiva con el token', async () => {
    let recibido: RequestInit | undefined;
    const fetchImpl = vi.fn(async (_u: unknown, init?: RequestInit) => {
      recibido = init;
      return new Response(JSON.stringify({ type: 'interactive_customer_info_needed', url: 'https://anchor/x', id: 'tx-1' }), { status: 200 });
    }) as unknown as typeof fetch;

    const retiro = await iniciarRetiro(SERVIDOR, 'jwt', 'SRT', CUENTA, fetchImpl);
    expect(retiro).toEqual({ id: 'tx-1', url: 'https://anchor/x' });
    expect((recibido?.headers as Record<string, string>).authorization).toBe('Bearer jwt');
    expect(JSON.parse(String(recibido?.body))).toMatchObject({ asset_code: 'SRT', account: CUENTA });
  });

  it('consulta el estado de un retiro', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toContain('id=tx-1');
      return new Response(JSON.stringify({ transaction: { id: 'tx-1', status: 'pending_anchor' } }), { status: 200 });
    }) as unknown as typeof fetch;
    expect((await consultarRetiro(SERVIDOR, 'jwt', 'tx-1', fetchImpl)).status).toBe('pending_anchor');
  });

  it('no se traga una respuesta que no es JSON', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>502</html>', { status: 502 })) as unknown as typeof fetch;
    await expect(consultarRetiro(SERVIDOR, 'jwt', 'tx-1', fetchImpl)).rejects.toThrow(/no es JSON/);
  });
});

describe('fallos del anchor, en cristiano', () => {
  it('traduce el rechazo de las credenciales con huella', () => {
    // El anchor de referencia responde esto ante credenciales address-bound (CAP-0071-02).
    expect(explicarFallo('Unknown enum value: 2')).toBe(RETIRO_NO_DISPONIBLE);
    expect(explicarFallo('Unknown enum value: 2')).not.toMatch(/enum/i);
  });

  it('no promete un envío que no va a ocurrir, y dice que el saldo sigue ahí', () => {
    expect(RETIRO_NO_DISPONIBLE).not.toMatch(/en breve|en camino|enviaremos/i);
    expect(RETIRO_NO_DISPONIBLE).toMatch(/saldo está intacto/);
  });

  it('deja pasar cualquier otro error tal cual', () => {
    expect(explicarFallo('Failed to simulate transaction')).toBe('Failed to simulate transaction');
  });

  it('tiene algo que decir aunque el anchor no explique nada', () => {
    expect(explicarFallo(undefined)).toMatch(/no aceptó tu identificación/);
  });
});
