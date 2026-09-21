import type { Cotizacion, Postulacion, ProviderProfile, Solicitud } from './DemoContext';

/**
 * Único criterio de compatibilidad del profesional. Lo comparten su Inicio y el badge
 * de la navegación, para que nunca muestren números distintos.
 */
export function alertasPara(
  providerProfile: ProviderProfile | null,
  solicitudes: readonly Solicitud[],
  postulaciones: readonly Postulacion[],
): Solicitud[] {
  const services = providerProfile?.services ?? [];
  const yaPostulo = new Set(
    postulaciones.filter(item => item.providerId === providerProfile?.id).map(item => item.solicitudId),
  );
  return solicitudes.filter(item =>
    item.estado === 'buscando_profesionales'
    && services.includes(item.servicio)
    && !yaPostulo.has(item.id));
}

/**
 * Solicitudes del cliente donde la pelota está de su lado: llegaron propuestas y falta
 * elegir, o llegó la cotización y falta responderla. Se cuentan solicitudes, no propuestas.
 */
export function solicitudesPorAtender(
  clienteId: string,
  solicitudes: readonly Solicitud[],
  postulaciones: readonly Postulacion[],
): Solicitud[] {
  return solicitudes.filter(item => {
    if (item.clienteId !== clienteId) return false;
    if (item.estado === 'cotizada') return true;
    return item.estado === 'buscando_profesionales'
      && postulaciones.some(propuesta => propuesta.solicitudId === item.id);
  });
}

/**
 * Solicitudes donde eligieron a este profesional y todavía no hay cotización esperando
 * respuesta. Tras un rechazo la solicitud vuelve a este estado, así que vuelve a contar.
 */
export function cotizacionesPorEnviar(
  providerProfile: ProviderProfile | null,
  solicitudes: readonly Solicitud[],
  postulaciones: readonly Postulacion[],
  cotizaciones: readonly Cotizacion[],
): Solicitud[] {
  if (!providerProfile) return [];
  const mias = new Set(
    postulaciones.filter(item => item.providerId === providerProfile.id).map(item => item.id),
  );
  return solicitudes.filter(item =>
    item.estado === 'profesional_elegido'
    && item.postulacionElegidaId !== undefined
    && mias.has(item.postulacionElegidaId)
    && !cotizaciones.some(row => row.solicitudId === item.id && row.estado === 'enviada'));
}
