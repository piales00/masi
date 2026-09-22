import type { Job } from '../../../shared/escrow';
import { esTerminal } from '../escrow/jobs';
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

/**
 * En qué momento del proceso está una solicitud del cliente. No son categorías ni
 * estados nuevos: es una lectura de los que ya existen, para que la misma solicitud
 * vaya cambiando de grupo en pantalla sin duplicarse nunca.
 *
 * Devuelve null cuando la solicitud ya no es un proceso activo (el trabajo terminó) o
 * cuando su trabajo todavía no se ha leído; en ambos casos no se muestra.
 */
export type GrupoCliente = 'buscando' | 'coordinando' | 'enCurso';

/** El trabajo que nació de esta solicitud, si la cotización aceptada ya lo registró. */
export function jobIdDeSolicitud(solicitudId: string, cotizaciones: readonly Cotizacion[]): string | null {
  return cotizaciones.find(item => item.solicitudId === solicitudId && item.estado === 'aceptada')?.jobId ?? null;
}

export function grupoDeSolicitud(
  solicitud: Solicitud,
  cotizaciones: readonly Cotizacion[],
  jobs: readonly Job[],
): GrupoCliente | null {
  if (solicitud.estado === 'buscando_profesionales') return 'buscando';
  // Elegido y cotizada siguen siendo coordinación: todavía no hay trabajo que seguir.
  if (solicitud.estado !== 'contratada') return 'coordinando';

  const jobId = jobIdDeSolicitud(solicitud.id, cotizaciones);
  // Contratada sin trabajo registrado: se sigue coordinando, no se esconde.
  if (!jobId) return 'coordinando';

  const job = jobs.find(item => item.id.toString() === jobId);
  if (!job) return null;
  if (esTerminal(job)) return null;

  const tag = job.state.tag;
  return tag === 'Requested' || tag === 'Accepted' ? 'coordinando' : 'enCurso';
}
