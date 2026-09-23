/**
 * SEP-1: el `stellar.toml` del anchor declara dónde vive cada servicio. Se leen solo
 * los campos que hacen falta, con un analizador mínimo: traer un parser de TOML entero
 * para seis claves no compensa.
 */
export interface Moneda {
  code: string;
  issuer?: string;
}

export interface InfoAnchor {
  webAuthContratoEndpoint?: string;
  webAuthContratoId?: string;
  transferServerSep24?: string;
  signingKey?: string;
  networkPassphrase?: string;
  monedas: Moneda[];
}

const CLAVES = {
  WEB_AUTH_FOR_CONTRACTS_ENDPOINT: 'webAuthContratoEndpoint',
  WEB_AUTH_CONTRACT_ID: 'webAuthContratoId',
  TRANSFER_SERVER_SEP0024: 'transferServerSep24',
  SIGNING_KEY: 'signingKey',
  NETWORK_PASSPHRASE: 'networkPassphrase',
} as const;

/** `clave = "valor"`. Las claves de cabecera van en mayúsculas y las de moneda no. */
const ASIGNACION = /^\s*([A-Za-z0-9_]+)\s*=\s*"([^"]*)"/;

export function parsearToml(texto: string): InfoAnchor {
  const info: InfoAnchor = { monedas: [] };
  let moneda: Moneda | null = null;

  for (const cruda of texto.split(/\r?\n/)) {
    // El comentario solo se recorta al principio: el resto de la línea lo acota
    // la comilla de cierre de ASIGNACION, así que un `#` dentro de un valor sobrevive.
    const linea = cruda.trim();
    if (!linea || linea.startsWith('#')) continue;

    if (linea.startsWith('[')) {
      if (moneda?.code) info.monedas.push(moneda);
      moneda = linea.toUpperCase().startsWith('[[CURRENCIES]]') ? { code: '' } : null;
      continue;
    }

    const encaje = ASIGNACION.exec(linea);
    if (!encaje) continue;
    const clave = encaje[1].toUpperCase();
    const valor = encaje[2];

    if (moneda) {
      if (clave === 'CODE') moneda.code = valor;
      if (clave === 'ISSUER') moneda.issuer = valor;
      continue;
    }
    const destino = CLAVES[clave as keyof typeof CLAVES];
    if (destino) info[destino] = valor;
  }
  if (moneda?.code) info.monedas.push(moneda);
  return info;
}

export async function leerToml(homeDomain: string, fetchImpl: typeof fetch = fetch): Promise<InfoAnchor> {
  const respuesta = await fetchImpl(`https://${homeDomain}/.well-known/stellar.toml`);
  if (!respuesta.ok) throw new Error(`El anchor no respondió (${respuesta.status}).`);
  return parsearToml(await respuesta.text());
}
