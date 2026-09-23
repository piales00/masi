import { Activity, ChevronRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { cn } from '../cn';
import { useDemo } from '../demo/DemoContext';
import { ETIQUETA, esTerminal, puedeCalificar } from '../escrow/jobs';
import type { JobRole } from '../escrow/jobs';
import { direccionDelProfesional, useJobsDe } from '../escrow/useJobsPorAtender';
import { formatSoles } from '../money';
import { serviceOf } from '../trades';
import type { Job } from '../../../shared/escrow';

const formatDate = (segundos: bigint): string =>
  new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(Number(segundos) * 1000));

/**
 * La mejor fecha terminal que conserva el trabajo. El contrato guarda `released_at`
 * al liberar o resolver, pero un cancelado no deja marca propia: para esos se usa la
 * fecha de creación, que es lo único fiable que hay.
 */
function fechaFinal(job: Job): bigint {
  return job.released_at ?? job.created_at;
}

const CHIP: Record<string, string> = {
  Released: 'bg-masi-green-50 text-masi-navy',
  Resolved: 'bg-masi-cream text-masi-navy',
  Cancelled: 'bg-masi-gray text-masi-text',
};

/**
 * Historial: solo servicios cuyo ciclo terminó. Lo que sigue vivo vive en Solicitudes,
 * así que un mismo trabajo nunca está en las dos pantallas.
 */
export function ActivityScreen({ role }: { role: JobRole }) {
  const navigate = useNavigate();
  const { clienteId, providerProfile, solicitudes, postulaciones, cotizaciones } = useDemo();

  const direccion = role === 'client' ? clienteId : direccionDelProfesional(providerProfile);
  const jobs = useJobsDe(direccion);

  const terminados = jobs
    .filter(esTerminal)
    .sort((a, b) => Number(fechaFinal(b) - fechaFinal(a)));

  return <Screen header={<ScreenHeader title="Actividad" back={false} />}>
    <div className="px-4 py-6">
      {terminados.length === 0
        ? <div className="rounded-masi-card border border-dashed border-masi-gray bg-white px-6 py-10 text-center">
          <Activity size={30} aria-hidden="true" className="mx-auto text-masi-blue" />
          <p className="mt-3 text-sm text-masi-muted">
            Aquí quedará el historial de tus servicios terminados.
          </p>
        </div>
        : <ul className="grid gap-3 lg:grid-cols-2">
          {terminados.map(job => {
            // Los datos de la demo que acompañan al trabajo; los de muestra no los tienen.
            const cotizacion = cotizaciones.find(item => item.jobId === job.id.toString());
            const solicitud = solicitudes.find(item => item.id === cotizacion?.solicitudId);
            const postulacion = postulaciones.find(item => item.id === cotizacion?.postulacionId);
            const servicio = solicitud?.servicio ?? 'Más servicios';
            const Icon = serviceOf(servicio).icon;
            const tag = job.state.tag;

            const contraparte = role === 'client'
              ? postulacion?.providerNombre ?? ''
              : solicitud?.cliente ?? '';
            // Solo se muestra dinero cuando se sabe con certeza cuánto se movió.
            const monto = tag === 'Released'
              ? (role === 'client'
                ? { etiqueta: 'Pagaste', valor: formatSoles(job.amount + job.fee_amount) }
                : { etiqueta: 'Recibiste', valor: formatSoles(job.amount) })
              : null;
            const destino = role === 'client' ? `/trabajos/${job.id}` : `/profesional/trabajos/${job.id}`;

            return <li key={job.id.toString()}>
              <button
                onClick={() => navigate(destino)}
                className="w-full rounded-masi-card border border-masi-gray bg-white p-4 text-left shadow-masi-sm transition-colors duration-200 ease-out hover:border-masi-blue"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                  <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-masi-blue">
                    <Icon size={15} aria-hidden="true" className="shrink-0" />
                    <span className="min-w-0 break-words">{servicio}</span>
                  </p>
                  <span className={cn('max-w-full rounded-full px-3 py-1 text-xs font-semibold break-words', CHIP[tag] ?? CHIP.Cancelled)}>
                    {ETIQUETA[tag]}
                  </span>
                </div>

                {contraparte && <p className="mt-2 text-sm font-semibold break-words text-masi-navy">
                  {role === 'client' ? 'Con' : 'Para'} {contraparte}
                </p>}

                <p className="mt-1 line-clamp-2 text-sm text-masi-text">{job.description}</p>

                {monto && <p className="mt-2 text-sm text-masi-muted">
                  {monto.etiqueta} <strong className="font-bold text-masi-navy">{monto.valor}</strong>
                </p>}

                {/*
                  * La calificación es lo que el cliente opinó, así que se le muestra a él.
                  * El profesional no la ve aquí: su reputación vive en su Inicio, agregada,
                  * no repetida trabajo por trabajo.
                  */}
                {job.rated && role === 'client' && <p className="mt-2 flex items-center gap-1 text-sm text-masi-muted">
                  <Star size={14} aria-hidden="true" className="fill-masi-orange text-masi-orange" />
                  <span>{job.stars} de 5</span>
                </p>}

                {puedeCalificar(job, role) && <p className="mt-2 text-sm font-semibold text-masi-navy">
                  Falta tu calificación
                </p>}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-masi-gray pt-3">
                  <p className="text-xs text-masi-muted">{formatDate(fechaFinal(job))}</p>
                  <span className="flex items-center gap-0.5 text-sm font-semibold text-masi-blue">
                    Ver detalles<ChevronRight size={16} aria-hidden="true" className="shrink-0" />
                  </span>
                </div>
              </button>
            </li>;
          })}
        </ul>}
    </div>
  </Screen>;
}
