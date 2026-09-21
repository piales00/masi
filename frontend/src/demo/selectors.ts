import type { Postulacion, ProviderProfile, Solicitud } from './DemoContext';

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

/** Solicitudes del cliente que ya recibieron propuestas y siguen sin profesional elegido. */
export function solicitudesPorAtender(
  clienteId: string,
  solicitudes: readonly Solicitud[],
  postulaciones: readonly Postulacion[],
): Solicitud[] {
  return solicitudes.filter(item =>
    item.clienteId === clienteId
    && item.estado === 'buscando_profesionales'
    && postulaciones.some(propuesta => propuesta.solicitudId === item.id));
}
