import { leerToml } from './sep1';
import { obtenerToken, type FirmarEntrada } from './sep45';
import { consultarRetiro, iniciarRetiro, type TransaccionAnchor } from './sep24';

/**
 * El retiro, de principio a fin.
 *
 * Anclap emite PEN —soles— en Stellar y permite sacarlos a una cuenta bancaria, pero
 * solo en mainnet y con KYC, así que no se puede conectar desde una demo en testnet.
 * El anchor de referencia de Stellar sí está en testnet y habla los mismos estándares,
 * así que la mecánica que se ve aquí es la de producción: cambia el anchor y el activo,
 * no el código.
 */
export const ANCHOR_DOMINIO = 'testanchor.stellar.org';
export const ACTIVO_DEMO = 'SRT';

export interface SesionRetiro {
  transferServer: string;
  token: string;
  id: string;
  url: string;
}

export async function abrirRetiro(
  cuenta: string,
  firmar: FirmarEntrada,
  fetchImpl: typeof fetch = fetch,
): Promise<SesionRetiro> {
  const info = await leerToml(ANCHOR_DOMINIO, fetchImpl);
  if (!info.webAuthContratoEndpoint || !info.webAuthContratoId || !info.signingKey) {
    throw new Error('Este anchor no admite cuentas con huella.');
  }
  if (!info.transferServerSep24) throw new Error('Este anchor no admite retiros.');

  const token = await obtenerToken({
    endpoint: info.webAuthContratoEndpoint,
    cuenta,
    homeDomain: ANCHOR_DOMINIO,
    webAuthDomain: new URL(info.webAuthContratoEndpoint).host,
    contratoAuth: info.webAuthContratoId,
    signingKey: info.signingKey,
    fetchImpl,
  }, firmar);

  const { id, url } = await iniciarRetiro(info.transferServerSep24, token, ACTIVO_DEMO, cuenta, fetchImpl);
  return { transferServer: info.transferServerSep24, token, id, url };
}

export function seguirRetiro(
  sesion: SesionRetiro,
  fetchImpl: typeof fetch = fetch,
): Promise<TransaccionAnchor> {
  return consultarRetiro(sesion.transferServer, sesion.token, sesion.id, fetchImpl);
}

/** Texto para la persona. El anchor devuelve códigos en inglés. */
export function textoEstado(estado: string): string {
  const textos: Record<string, string> = {
    incomplete: 'Falta completar tus datos en la ventana del anchor.',
    pending_user_transfer_start: 'Listo. Falta que envíes el monto al anchor.',
    pending_user_transfer_complete: 'Recibimos tu envío. El anchor está procesando.',
    pending_anchor: 'El anchor está procesando tu retiro.',
    pending_external: 'El dinero va camino a tu banco.',
    completed: 'Retiro completado.',
    refunded: 'El retiro se devolvió.',
    expired: 'La solicitud caducó. Puedes empezar otra.',
    error: 'El anchor no pudo completar el retiro.',
  };
  return textos[estado] ?? 'Tu retiro está en curso.';
}
