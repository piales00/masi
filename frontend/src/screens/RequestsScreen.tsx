import { ChevronRight, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { cn } from '../cn';
import { useDemo } from '../demo/DemoContext';
import type { Cotizacion, Postulacion, Solicitud } from '../demo/DemoContext';
import { grupoDeSolicitud, jobIdDeSolicitud, solicitudesPorAtender } from '../demo/selectors';
import type { GrupoCliente } from '../demo/selectors';
import { ETIQUETA, vistaDelTrabajo } from '../escrow/jobs';
import { useJobsDe } from '../escrow/useJobsPorAtender';
import { serviceOf } from '../trades';
import type { Job } from '../../../shared/escrow';

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

/**
 * Una sola tarjeta por solicitud: cambia de etapa, no se duplica. El chip dice la etapa
 * en pocas palabras y el nombre del profesional va en su propia línea, que sí puede
 * envolver: dentro del chip, un nombre largo desbordaba la tarjeta en móvil.
 */
interface Etapa {
  chip?: string;
  chipClase?: string;
  detalle?: string;
  nota?: string;
  cta?: string;
  destino: string;
  /** La pelota está del lado del cliente: la tarjeta se remarca. */
  atencion: boolean;
}

const CHIP_HECHO = 'bg-masi-green-50 text-masi-navy';
const CHIP_ESPERA = 'bg-masi-gray text-masi-text';
const CHIP_ATENCION = 'bg-masi-blue text-white';

function etapaDe(
  solicitud: Solicitud,
  propuestas: Postulacion[],
  cotizaciones: readonly Cotizacion[],
  job: Job | undefined,
): Etapa {
  const elegida = propuestas.find(item => item.id === solicitud.postulacionElegidaId);
  const ficha = `/solicitudes/${solicitud.id}`;

  if (solicitud.estado === 'contratada') {
    const trabajo = cotizaciones.find(item => item.solicitudId === solicitud.id && item.estado === 'aceptada');
    // Con el trabajo a la vista, la tarjeta dice su estado real y ofrece lo que toca.
    const vista = job ? vistaDelTrabajo(job, 'client', { contraparte: elegida?.providerNombre ?? '' }) : null;
    return {
      chip: job ? ETIQUETA[job.state.tag] : 'Contratado',
      chipClase: vista?.principal ? CHIP_ATENCION : CHIP_HECHO,
      detalle: elegida && `Con ${elegida.providerNombre}`,
      cta: trabajo?.jobId ? (vista?.principal?.label ?? 'Ver servicio') : undefined,
      destino: trabajo?.jobId ? `/trabajos/${trabajo.jobId}` : ficha,
      atencion: Boolean(vista?.principal),
    };
  }

  if (solicitud.estado === 'cotizada') {
    return {
      chip: 'Cotización recibida',
      chipClase: CHIP_ATENCION,
      detalle: elegida?.providerNombre,
      cta: 'Revisar cotización',
      destino: ficha,
      atencion: true,
    };
  }

  if (solicitud.estado === 'profesional_elegido') {
    return {
      chip: 'Profesional elegido',
      chipClase: CHIP_ESPERA,
      detalle: elegida && `Elegiste a ${elegida.providerNombre}`,
      nota: 'Esperando su cotización',
      destino: ficha,
      atencion: false,
    };
  }

  if (propuestas.length === 0) {
    return { chip: 'Esperando propuestas', chipClase: CHIP_ESPERA, destino: ficha, atencion: false };
  }

  // El conteo ya está arriba en el resumen: aquí basta con la acción.
  return {
    cta: propuestas.length === 1 ? 'Ver 1 propuesta' : `Ver ${propuestas.length} propuestas`,
    destino: ficha,
    atencion: true,
  };
}

/** Cada grupo con su título y su explicación; los vacíos no se dibujan. */
const GRUPOS: readonly { id: GrupoCliente; titulo: string; ayuda: string }[] = [
  { id: 'buscando', titulo: 'Buscando profesional', ayuda: 'Revisa las propuestas y elige al profesional para tu servicio.' },
  { id: 'coordinando', titulo: 'Coordinando el servicio', ayuda: 'Coordina los pasos necesarios antes de iniciar el servicio.' },
  { id: 'enCurso', titulo: 'Servicios en curso', ayuda: 'Sigue los servicios que ya están siendo atendidos.' },
];

export function RequestsScreen() {
  const { clienteId, solicitudes, postulaciones, cotizaciones } = useDemo();
  const navigate = useNavigate();
  const jobs = useJobsDe(clienteId);

  const mias = solicitudes.filter(item => item.clienteId === clienteId);
  // Una solicitud cae en un único grupo, y la que ya terminó no cae en ninguno.
  const porGrupo = new Map<GrupoCliente, Solicitud[]>();
  for (const solicitud of mias) {
    const grupo = grupoDeSolicitud(solicitud, cotizaciones, jobs);
    if (!grupo) continue;
    porGrupo.set(grupo, [...(porGrupo.get(grupo) ?? []), solicitud]);
  }
  const activas = [...porGrupo.values()].reduce((total, lista) => total + lista.length, 0);

  // Se parte del mismo selector que el badge, así resumen y navegación nunca discrepan.
  const porAtender = solicitudesPorAtender(clienteId, solicitudes, postulaciones);
  const conPropuestas = porAtender.filter(item => item.estado === 'buscando_profesionales').length;
  const conCotizacion = porAtender.length - conPropuestas;

  const resumen = [
    { label: conPropuestas === 1 ? 'Solicitud con propuestas' : 'Solicitudes con propuestas', count: conPropuestas },
    { label: conCotizacion === 1 ? 'Cotización por revisar' : 'Cotizaciones por revisar', count: conCotizacion },
  ].filter(item => item.count > 0);

  return <Screen header={<ScreenHeader title="Solicitudes" back={false} />}>
    <div className="px-4 py-6">
      {resumen.length > 0 && <section aria-label="Pendientes de tu revisión" className="mb-4 rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <dl className="space-y-2">
          {resumen.map(({ label, count }) => <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-sm font-semibold text-masi-navy">{label}</dt>
            <dd className="grid min-w-6 shrink-0 place-items-center rounded-full bg-masi-blue px-2 py-0.5 text-sm font-bold text-white">{count}</dd>
          </div>)}
        </dl>
      </section>}

      {activas === 0
        ? <div className="rounded-masi-card border border-dashed border-masi-gray bg-white px-6 py-10 text-center">
          <ClipboardList size={30} aria-hidden="true" className="mx-auto text-masi-blue" />
          <p className="mt-3 text-sm text-masi-muted">Aquí verás las solicitudes que publiques y las propuestas que recibas.</p>
        </div>
        : GRUPOS.filter(grupo => (porGrupo.get(grupo.id)?.length ?? 0) > 0).map((grupo, indice) => <section
          key={grupo.id}
          aria-labelledby={grupo.id}
          className={cn(indice > 0 && 'mt-8')}
        >
          <h2 id={grupo.id} className="text-lg font-bold text-masi-navy">{grupo.titulo}</h2>
          <p className="mt-1 text-sm text-masi-muted">{grupo.ayuda}</p>

          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {(porGrupo.get(grupo.id) ?? []).map(solicitud => {
              const propuestas = postulaciones.filter(item => item.solicitudId === solicitud.id);
              const Icon = serviceOf(solicitud.servicio).icon;
              const jobId = jobIdDeSolicitud(solicitud.id, cotizaciones);
              const job = jobs.find(item => item.id.toString() === jobId);
              const etapa = etapaDe(solicitud, propuestas, cotizaciones, job);
              return <li key={solicitud.id}>
                <button
                  onClick={() => navigate(etapa.destino)}
                  className={cn(
                    'w-full rounded-masi-card border bg-white p-4 text-left shadow-masi-sm transition-colors duration-200 ease-out hover:border-masi-blue',
                    etapa.atencion ? 'border-masi-blue' : 'border-masi-gray',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                    <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-masi-blue">
                      <Icon size={15} aria-hidden="true" className="shrink-0" />
                      <span className="min-w-0 break-words">{solicitud.servicio}</span>
                    </p>
                    {etapa.chip && <span className={cn('max-w-full rounded-full px-3 py-1 text-xs font-semibold break-words', etapa.chipClase)}>
                      {etapa.chip}
                    </span>}
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm text-masi-text">{solicitud.descripcion}</p>

                  {etapa.detalle && <p className="mt-1.5 text-sm font-semibold break-words text-masi-navy">{etapa.detalle}</p>}
                  {etapa.nota && <p className="mt-0.5 text-xs text-masi-muted">{etapa.nota}</p>}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-masi-gray pt-3">
                    <p className="text-xs text-masi-muted">{formatDate(solicitud.creadaEn)}</p>
                    {etapa.cta && <span className="flex min-w-0 items-center gap-0.5 text-sm font-semibold text-masi-blue">
                      <span className="min-w-0 break-words">{etapa.cta}</span>
                      <ChevronRight size={16} aria-hidden="true" className="shrink-0" />
                    </span>}
                  </div>
                </button>
              </li>;
            })}
          </ul>
        </section>)}
    </div>
  </Screen>;
}
