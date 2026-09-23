import { Address, xdr, scValToNative } from '@stellar/stellar-sdk';
import { codificarEntradas, decodificarEntradas } from './entradas';

/**
 * SEP-45 — autenticación web para cuentas de contrato.
 *
 * SEP-10 firma un sobre de transacción con la llave de una cuenta `G…`. Nuestros
 * usuarios no tienen llave: son smart wallets con passkey, direcciones `C…`. SEP-45
 * resuelve eso con entradas de autorización de Soroban: el anchor arma una llamada a
 * `web_auth_verify`, el usuario firma su entrada con la huella y el anchor devuelve un JWT.
 */
export interface RetoVerificado {
  entradas: xdr.SorobanAuthorizationEntry[];
  /** La entrada que nos toca firmar. El resto ya viene firmado por el anchor. */
  indicePropio: number;
  /** Ledger de caducidad del anchor. La firma propia usa el mismo para no descuadrar. */
  expiracion: number;
}

export interface EsperadoDelReto {
  cuenta: string;
  homeDomain: string;
  webAuthDomain: string;
  contratoAuth: string;
  signingKey: string;
}

/** Firma una entrada. La implementación real la pone `passkeys.ts`. */
export type FirmarEntrada = (
  entrada: xdr.SorobanAuthorizationEntry,
  expiracion: number,
) => Promise<xdr.SorobanAuthorizationEntry>;

function direccionDe(credenciales: xdr.SorobanCredentials): string | null {
  if (credenciales.switch().name !== 'sorobanCredentialsAddress') return null;
  return Address.fromScAddress(credenciales.address().address()).toString();
}

function sinFirmar(credenciales: xdr.SorobanCredentials): boolean {
  return credenciales.address().signature().switch().name === 'scvVoid';
}

/**
 * Comprueba que el reto es el que pedimos antes de ponerle una huella encima.
 *
 * Sin esto estaríamos firmando a ciegas lo que mande el servidor. El daño posible es
 * acotado —la entrada solo autoriza `web_auth_verify`—, pero la especificación lo exige
 * y es la diferencia entre autenticarse y firmar un cheque en blanco.
 */
export function verificarReto(base64: string, esperado: EsperadoDelReto): RetoVerificado {
  const entradas = decodificarEntradas(base64);
  if (entradas.length < 2) throw new Error('El reto del anchor está incompleto.');

  for (const entrada of entradas) {
    const raiz = entrada.rootInvocation();
    if (raiz.subInvocations().length > 0) {
      throw new Error('El reto del anchor incluye llamadas anidadas.');
    }
    const fn = raiz.function();
    if (fn.switch().name !== 'sorobanAuthorizedFunctionTypeContractFn') {
      throw new Error('El reto del anchor no es una llamada de contrato.');
    }
    const llamada = fn.contractFn();
    if (Address.fromScAddress(llamada.contractAddress()).toString() !== esperado.contratoAuth) {
      throw new Error('El reto apunta a otro contrato de autenticación.');
    }
    if (llamada.functionName().toString() !== 'web_auth_verify') {
      throw new Error('El reto del anchor no es una autenticación.');
    }
    const argumentos = llamada.args();
    if (argumentos.length !== 1) throw new Error('El reto del anchor tiene argumentos inesperados.');
    const datos = scValToNative(argumentos[0]) as Record<string, unknown>;
    if (datos.account !== esperado.cuenta) throw new Error('El reto es para otra cuenta.');
    if (datos.home_domain !== esperado.homeDomain) throw new Error('El reto es para otro dominio.');
    if (datos.web_auth_domain !== esperado.webAuthDomain) {
      throw new Error('El reto declara otro dominio de autenticación.');
    }
  }

  const propias = entradas
    .map((entrada, indice) => ({ entrada, indice }))
    .filter(({ entrada }) => direccionDe(entrada.credentials()) === esperado.cuenta);
  if (propias.length !== 1) throw new Error('El reto no trae exactamente una entrada para tu cuenta.');
  if (!sinFirmar(propias[0].entrada.credentials())) throw new Error('Tu entrada del reto ya venía firmada.');

  const delAnchor = entradas.find(entrada => direccionDe(entrada.credentials()) === esperado.signingKey);
  if (!delAnchor) throw new Error('El reto no viene firmado por el anchor.');
  const expiracion = delAnchor.credentials().address().signatureExpirationLedger();
  if (expiracion <= 0) throw new Error('El reto del anchor no declara caducidad.');

  return { entradas, indicePropio: propias[0].indice, expiracion };
}

export interface OpcionesToken extends EsperadoDelReto {
  endpoint: string;
  fetchImpl?: typeof fetch;
}

/** Pide el reto, lo verifica, lo firma con la huella y lo canjea por un JWT. */
export async function obtenerToken(opciones: OpcionesToken, firmar: FirmarEntrada): Promise<string> {
  const { endpoint, cuenta, homeDomain, fetchImpl = fetch } = opciones;

  const url = new URL(endpoint);
  url.searchParams.set('account', cuenta);
  url.searchParams.set('home_domain', homeDomain);
  const reto = await fetchImpl(url.toString());
  if (!reto.ok) throw new Error(`El anchor rechazó la solicitud de acceso (${reto.status}).`);
  const cuerpo = await reto.json() as { authorizationEntries?: string };
  if (!cuerpo.authorizationEntries) throw new Error('El anchor no devolvió un reto.');

  const { entradas, indicePropio, expiracion } = verificarReto(cuerpo.authorizationEntries, opciones);
  const firmadas = [...entradas];
  firmadas[indicePropio] = await firmar(entradas[indicePropio], expiracion);

  const entradasFirmadas = codificarEntradas(firmadas);
  const canje = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    /*
     * Se mandan las dos grafías a propósito. La especificación nombra
     * `authorization_entries`, pero el anchor de referencia lee `authorizationEntries`
     * y responde "authorization_entries is required" cuando solo llega la del estándar
     * —el mensaje apunta justo al revés del campo que espera—. Comprobado contra
     * testanchor.stellar.org el 23/09/2026.
     */
    body: JSON.stringify({
      authorization_entries: entradasFirmadas,
      authorizationEntries: entradasFirmadas,
    }),
  });
  const resultado = await canje.json() as { token?: string; error?: string };
  if (!canje.ok || !resultado.token) {
    throw new Error(explicarFallo(resultado.error));
  }
  return resultado.token;
}

/**
 * El anchor de referencia responde "Unknown enum value: 2" cuando recibe credenciales
 * address-bound (CAP-0071-02).
 *
 * No es un fallo de la cuenta ni de esta app: `passkey-kit` convierte las credenciales
 * de V1 a V2 antes de firmar, a propósito, para que una firma hecha en una smart wallet
 * no sirva en otra. El servidor de pruebas todavía solo entiende V1, así que rechaza una
 * firma correcta. Con un anchor que admita V2 —o con SEP-10 y una cuenta clásica— el
 * mismo código funciona.
 */
export const RETIRO_NO_DISPONIBLE = 'Verificamos tu identidad con tu huella. Nuestro proveedor de '
  + 'pagos todavía no admite cuentas con huella, así que aún no podemos enviar el dinero. Tu saldo '
  + 'está intacto.';

export function explicarFallo(error: string | undefined): string {
  if (error && /unknown enum value/i.test(error)) return RETIRO_NO_DISPONIBLE;
  return error || 'El anchor no aceptó tu identificación.';
}
