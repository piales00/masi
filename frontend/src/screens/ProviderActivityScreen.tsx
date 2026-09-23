import { Activity, CheckCircle2, ChevronRight, Clock3, Send, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { cn } from '../cn';
import { useDemo } from '../demo/DemoContext';
import type { Cotizacion, Postulacion, Solicitud } from '../demo/DemoContext';
import type { Trade } from '../marketplace';
import { alertasPara } from '../demo/selectors';
import { esTerminal, requiereAccionDe, vistaDelTrabajo } from '../escrow/jobs';
import { direccionDelProfesional, useTrabajosDe } from '../escrow/useJobsPorAtender';
import { formatPrice } from '../marketplace';
import { serviceOf } from '../trades';
import type { Job } from '../../../shared/escrow';

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

/**
 * Tres etapas que no significan lo mismo para el profesional y por eso no se pintan igual:
 * una oportunidad donde todavía compite, una relación ya iniciada con un cliente que lo
 * eligió, y un trabajo con dinero de por medio. Cada proceso aparece en una sola tarjeta,
 * en el bloque de su etapa actual.
 */
type Etapa = 'oportunidad' | 'postulada' | 'elegido' | 'cotizada' | 'trabajo';

interface Tarjeta {
  clave: string;
  etapa: Etapa;
  servicio: Trade;
  distrito: string;
  descripcion: string;
  chip: string;
  chipIcono: LucideIcon | null;
  chipClase: string;
  /** Qué está pasando, en una línea. */
  detalle?: string;
  /** Qué toca después, cuando el profesional tiene que hacer algo. */
  siguiente?: string;
  propuesta?: { precio: number; minutos: number; fecha: string };
  cta: string;
  destino: string;
  requiereAccion: boolean;
}

const CHIP_ACCION = 'bg-masi-blue text-white';
const CHIP_HECHO = 'bg-masi-green-50 text-masi-navy';
const CHIP_ESPERA = 'bg-masi-gray text-masi-text';

/** Trabajos en proceso: el cliente ya eligió a este profesional. */
function enProceso(
  postulacion: Postulacion,
  solicitud: Solicitud,
  cotizacion: Cotizacion | undefined,
  job: Job | undefined,
  cliente: string,
): Tarjeta | null {
  const base = {
    clave: postulacion.id,
    servicio: solicitud.servicio,
    distrito: solicitud.distrito,
    descripcion: solicitud.descripcion,
  };

  if (solicitud.estado === 'contratada') {
    /*
     * A partir de aquí manda el trabajo: la solicitud ya cumplió su papel. Y un trabajo
     * solo se pinta con su `Job` delante. Antes, mientras la lectura de la cadena estaba
     * en vuelo, esta rama devolvía igualmente una tarjeta con «Trabajo en curso» y
     * «Continuar trabajo» deducidos de la cotización: un estado inventado que aparecía
     * en cada entrada a la pantalla y se corregía al llegar los trabajos.
     */
    if (!cotizacion?.jobId || !job) return null;
    const vista = vistaDelTrabajo(job, 'provider', { contraparte: cliente });
    const requiereAccion = requiereAccionDe(job, 'provider');
    return {
      ...base,
      etapa: 'trabajo',
      chip: vista.etiqueta,
      chipIcono: null,
      chipClase: requiereAccion ? CHIP_ACCION : CHIP_HECHO,
      detalle: vista.titulo,
      siguiente: vista.principal ? vista.detalle : undefined,
      cta: 'Continuar trabajo',
      destino: `/profesional/trabajos/${cotizacion.jobId}`,
      requiereAccion,
    };
  }

  if (solicitud.estado === 'cotizada') {
    return {
      ...base,
      etapa: 'cotizada',
      chip: 'Cotización enviada',
      chipIcono: Send,
      chipClase: CHIP_ESPERA,
      detalle: `Esperando la respuesta de ${cliente}.`,
      cta: 'Ver solicitud',
      destino: `/profesional/alertas/${solicitud.id}`,
      requiereAccion: false,
    };
  }

  return {
    ...base,
    etapa: 'elegido',
    chip: 'Te eligieron',
    chipIcono: CheckCircle2,
    chipClase: CHIP_ACCION,
    detalle: `${cliente} eligió tu propuesta.`,
    siguiente: 'Visita al cliente, evalúa el problema y envía tu cotización final.',
    cta: 'Enviar cotización final',
    destino: `/profesional/cotizacion/${solicitud.id}`,
    requiereAccion: true,
  };
}

/** Solicitudes de clientes: todavía es una oportunidad, nadie lo eligió. */
function oportunidad(postulacion: Postulacion, solicitud: Solicitud | undefined): Tarjeta {
  const descartada = solicitud?.estado !== 'buscando_profesionales';
  return {
    clave: postulacion.id,
    etapa: 'postulada',
    servicio: solicitud?.servicio ?? 'Más servicios',
    distrito: solicitud?.distrito ?? '',
    descripcion: solicitud?.descripcion ?? '',
    chip: descartada ? 'Eligieron a otro profesional' : 'Postulación enviada',
    chipIcono: descartada ? XCircle : Send,
    chipClase: CHIP_ESPERA,
    detalle: descartada ? undefined : 'Esperando la decisión del cliente.',
    propuesta: { precio: postulacion.precio, minutos: postulacion.minutos, fecha: postulacion.fecha },
    cta: 'Ver solicitud',
    destino: solicitud ? `/profesional/alertas/${solicitud.id}` : '/profesional',
    requiereAccion: false,
  };
}

function nueva(solicitud: Solicitud): Tarjeta {
  return {
    clave: `alerta-${solicitud.id}`,
    etapa: 'oportunidad',
    servicio: solicitud.servicio,
    distrito: solicitud.distrito,
    descripcion: solicitud.descripcion,
    chip: 'Nueva solicitud',
    chipIcono: null,
    chipClase: CHIP_HECHO,
    detalle: 'Todavía puedes postular.',
    cta: 'Ver solicitud',
    destino: `/profesional/alertas/${solicitud.id}`,
    requiereAccion: false,
  };
}

function Tarjetas({ items, onAbrir }: { items: Tarjeta[]; onAbrir: (destino: string) => void }) {
  return <ul className="mt-3 grid gap-3 lg:grid-cols-2">
    {items.map(item => {
      const Icon = serviceOf(item.servicio).icon;
      const ChipIcon = item.chipIcono;
      // Solo lo que ya avanzó con un cliente lleva botón; una oportunidad se abre entera.
      const conBoton = item.etapa === 'elegido' || item.etapa === 'trabajo';
      const contenido = <>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-masi-blue">
            <Icon size={15} aria-hidden="true" className="shrink-0" />
            <span className="min-w-0 break-words">{item.servicio}</span>
            {item.distrito && <span className="text-masi-muted">· {item.distrito}</span>}
          </p>
          <span className={cn('flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', item.chipClase)}>
            {ChipIcon && <ChipIcon size={13} aria-hidden="true" className="shrink-0" />}
            <span className="min-w-0 break-words">{item.chip}</span>
          </span>
        </div>

        {item.detalle && <p className="mt-2 text-sm font-semibold break-words text-masi-navy">{item.detalle}</p>}
        {item.descripcion && <p className="mt-1.5 line-clamp-2 text-sm text-masi-text">{item.descripcion}</p>}
        {item.siguiente && <p className="mt-2 text-sm text-masi-muted">{item.siguiente}</p>}

        {item.propuesta && <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-masi-gray pt-3 text-xs text-masi-muted">
          <div className="flex items-center gap-1.5">
            <dt className="font-semibold text-masi-navy">Tu propuesta:</dt>
            <dd>{formatPrice(item.propuesta.precio)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt><Clock3 size={14} aria-hidden="true" /><span className="sr-only">Llegada estimada</span></dt>
            <dd>{item.propuesta.minutos} min</dd>
          </div>
          <dd className="w-full">{formatDate(item.propuesta.fecha)}</dd>
        </dl>}
      </>;

      const marco = cn(
        'w-full rounded-masi-card border bg-white p-4 text-left shadow-masi-sm',
        item.requiereAccion ? 'border-masi-blue' : 'border-masi-gray',
      );

      return <li key={item.clave}>
        {conBoton
          ? <div className={marco}>
            {contenido}
            <Button className="mt-3" onClick={() => onAbrir(item.destino)}>{item.cta}</Button>
          </div>
          : <button
            onClick={() => onAbrir(item.destino)}
            className={cn(marco, 'transition-colors duration-200 ease-out hover:border-masi-blue')}
          >
            {contenido}
            <span className="mt-3 flex items-center justify-end gap-0.5 border-t border-masi-gray pt-3 text-sm font-semibold text-masi-blue">
              {item.cta}<ChevronRight size={16} aria-hidden="true" className="shrink-0" />
            </span>
          </button>}
      </li>;
    })}
  </ul>;
}

export function ProviderActivityScreen() {
  const navigate = useNavigate();
  const { providerProfile, solicitudes, postulaciones, cotizaciones } = useDemo();
  const { jobs, listos } = useTrabajosDe(direccionDelProfesional(providerProfile));

  const mine = postulaciones.filter(item => item.providerId === providerProfile?.id);
  const cotizacionDe = (postulacionId: string) =>
    cotizaciones.find(item => item.postulacionId === postulacionId && item.estado === 'aceptada');

  const proceso: Tarjeta[] = [];
  const oportunidades: Tarjeta[] = [];
  /** Trabajos que existen pero todavía no se han leído: se reserva su sitio, nada más. */
  let esperando = 0;

  for (const postulacion of mine) {
    const solicitud = solicitudes.find(row => row.id === postulacion.solicitudId);
    const elegida = solicitud?.postulacionElegidaId === postulacion.id;
    if (solicitud && elegida && solicitud.estado !== 'buscando_profesionales') {
      const cotizacion = cotizacionDe(postulacion.id);
      if (solicitud.estado === 'contratada' && cotizacion?.jobId && !listos) {
        // Sabemos que hay un trabajo, no en qué estado está. Se espera a la cadena.
        esperando += 1;
        continue;
      }
      const job = jobs.find(item => item.id.toString() === cotizacion?.jobId);
      // Un servicio terminado ya no es un proceso activo: sale de Solicitudes. El
      // historial lo recoge Actividad.
      if (job && esTerminal(job)) continue;
      const tarjeta = enProceso(postulacion, solicitud, cotizacion, job, solicitud.cliente || 'El cliente');
      // Contratada sin trabajo legible: no se afirma que está en curso, y tampoco
      // vuelve a ser una oportunidad, que sería peor mentira.
      if (tarjeta) proceso.push(tarjeta);
      continue;
    }
    oportunidades.push(oportunidad(postulacion, solicitud));
  }

  // Las disponibles ya excluyen aquellas donde este profesional postuló.
  for (const solicitud of alertasPara(providerProfile, solicitudes, postulaciones)) {
    oportunidades.push(nueva(solicitud));
  }

  // Primero lo que espera una acción suya; no hay más ranking que ese.
  proceso.sort((a, b) => Number(b.requiereAccion) - Number(a.requiereAccion));

  const vacio = proceso.length === 0 && oportunidades.length === 0 && esperando === 0;
  const hayProceso = proceso.length > 0 || esperando > 0;

  return <Screen header={<ScreenHeader title="Solicitudes" back={false} />}>
    <div className="px-4 py-6">
      {vacio && <div className="rounded-masi-card border border-dashed border-masi-gray bg-white px-6 py-10 text-center">
        <Activity size={30} aria-hidden="true" className="mx-auto text-masi-blue" />
        <p className="mt-3 text-sm text-masi-muted">Aquí verás las solicitudes de tu zona y los trabajos que vayas tomando.</p>
      </div>}

      {hayProceso && <section aria-labelledby="en-proceso">
        <h2 id="en-proceso" className="text-lg font-bold text-masi-navy">Trabajos en proceso</h2>
        <p className="mt-1 text-sm text-masi-muted">Servicios activos con tus clientes.</p>
        {proceso.length > 0 && <Tarjetas items={proceso} onAbrir={navigate} />}
        {esperando > 0 && <>
          <p role="status" className="sr-only">Buscando tus trabajos…</p>
          <ul aria-hidden="true" className="mt-3 grid gap-3 lg:grid-cols-2">
            {Array.from({ length: esperando }, (_, index) => <li
              key={index}
              className="h-32 animate-pulse rounded-masi-card border border-masi-gray bg-white"
            />)}
          </ul>
        </>}
      </section>}

      {oportunidades.length > 0 && <section aria-labelledby="oportunidades" className={cn(hayProceso && 'mt-8')}>
        <h2 id="oportunidades" className="text-lg font-bold text-masi-navy">Solicitudes de clientes</h2>
        <p className="mt-1 text-sm text-masi-muted">Todavía esperan que el cliente elija.</p>
        <Tarjetas items={oportunidades} onAbrir={navigate} />
      </section>}
    </div>
  </Screen>;
}
