/**
 * SEP-24 — depósito y retiro alojados por el anchor.
 *
 * El anchor se encarga del KYC y de los datos bancarios en su propia ventana: la app
 * nunca los ve. Aquí solo se pide la URL interactiva y se consulta el estado.
 */
export interface RetiroIniciado {
  id: string;
  url: string;
}

export type EstadoRetiro =
  | 'incomplete'
  | 'pending_user_transfer_start'
  | 'pending_anchor'
  | 'completed'
  | 'error'
  | (string & {});

export interface TransaccionAnchor {
  id: string;
  status: EstadoRetiro;
  amount_in?: string;
  amount_out?: string;
  withdraw_anchor_account?: string;
  withdraw_memo?: string;
  message?: string;
}

async function comoJson(respuesta: Response): Promise<Record<string, unknown>> {
  const texto = await respuesta.text();
  try {
    return JSON.parse(texto) as Record<string, unknown>;
  } catch {
    throw new Error(`El anchor respondió algo que no es JSON (${respuesta.status}).`);
  }
}

/** Activos que el anchor acepta retirar ahora mismo. */
export async function activosDeRetiro(
  transferServer: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const respuesta = await fetchImpl(`${transferServer}/info`);
  if (!respuesta.ok) throw new Error(`No se pudo leer la información del anchor (${respuesta.status}).`);
  const datos = await comoJson(respuesta);
  const retiro = (datos.withdraw ?? {}) as Record<string, { enabled?: boolean }>;
  return Object.entries(retiro).filter(([, valor]) => valor?.enabled).map(([codigo]) => codigo);
}

export async function iniciarRetiro(
  transferServer: string,
  token: string,
  assetCode: string,
  cuenta: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RetiroIniciado> {
  const respuesta = await fetchImpl(`${transferServer}/transactions/withdraw/interactive`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ asset_code: assetCode, account: cuenta, lang: 'es' }),
  });
  const datos = await comoJson(respuesta);
  if (!respuesta.ok || typeof datos.url !== 'string' || typeof datos.id !== 'string') {
    throw new Error(String(datos.error ?? 'El anchor no pudo abrir el retiro.'));
  }
  return { id: datos.id, url: datos.url };
}

export async function consultarRetiro(
  transferServer: string,
  token: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TransaccionAnchor> {
  const url = new URL(`${transferServer}/transaction`);
  url.searchParams.set('id', id);
  const respuesta = await fetchImpl(url.toString(), { headers: { authorization: `Bearer ${token}` } });
  const datos = await comoJson(respuesta);
  const transaccion = datos.transaction as TransaccionAnchor | undefined;
  if (!respuesta.ok || !transaccion) {
    throw new Error(String(datos.error ?? 'No se pudo consultar el retiro.'));
  }
  return transaccion;
}
