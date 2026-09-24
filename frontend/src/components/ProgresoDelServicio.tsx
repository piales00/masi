import { TriangleAlert } from 'lucide-react';
import { cn } from '../cn';
import { ETAPAS_DEL_SERVICIO, progresoDelServicio } from '../escrow/jobs';
import type { Job } from '../../../shared/escrow';

/**
 * «¿En qué etapa está mi servicio?», en una línea de puntos que cabe en 360 px.
 *
 * Los cinco nombres no se pintan a la vez: no entran y competirían entre ellos. Se pinta
 * la línea y, debajo, el nombre de la etapa actual; qué está pasando y qué toca hacer lo
 * siguen contando el título y el texto de la tarjeta, que ya distinguen cliente de
 * profesional. El mapeo vive en `escrow/jobs.ts`, sin React: aquí no se decide nada.
 */
export function ProgresoDelServicio({ job }: { job: Job }) {
  const { hechas, actual, enMarcha, etiqueta, incidencia } = progresoDelServicio(job);
  const etapa = ETAPAS_DEL_SERVICIO[actual];
  /*
   * El tramo que lleva de la última etapa cumplida a la que está en curso, y solo ese:
   * es lo único que todavía está pasando. Con el servicio terminado no queda ninguno en
   * marcha, y una incidencia ni siquiera dibuja la línea.
   */
  const tramoEnMarcha = incidencia === null && hechas < ETAPAS_DEL_SERVICIO.length && actual > 0
    ? actual
    : -1;

  if (incidencia) {
    return <p className={cn(
      'flex items-center gap-2 rounded-masi-input px-3 py-2 text-sm font-semibold',
      incidencia === 'revision' ? 'bg-masi-cream text-masi-navy' : 'bg-masi-gray/60 text-masi-navy',
    )}>
      {incidencia === 'revision' && <TriangleAlert size={15} aria-hidden="true" className="shrink-0" />}
      <span className="min-w-0 break-words">{etiqueta}</span>
    </p>;
  }

  return <div>
    <ol aria-hidden="true" className="flex items-center gap-1">
      {ETAPAS_DEL_SERVICIO.map((etapa, indice) => {
        const cumplida = indice < hechas;
        const esActual = indice === actual;
        return <li key={etapa} className={cn('flex items-center', indice > 0 && 'min-w-0 flex-1 gap-1')}>
          {indice > 0 && (indice === tramoEnMarcha
            ? <span
              data-tramo="en-marcha"
              className="relative h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-masi-blue-50"
            >
              <span className="absolute inset-y-0 w-1/3 rounded-full bg-masi-blue animate-masi-avance" />
            </span>
            : <span className={cn(
              'h-0.5 min-w-0 flex-1 rounded-full motion-safe:transition-colors motion-safe:duration-300',
              cumplida ? 'bg-masi-blue' : 'bg-masi-gray',
            )} />)}
          <span className={cn(
            'size-2.5 shrink-0 rounded-full border-2 motion-safe:transition-colors motion-safe:duration-300',
            cumplida || (esActual && enMarcha)
              ? 'border-masi-blue bg-masi-blue'
              : esActual ? 'border-masi-blue bg-white' : 'border-masi-gray bg-white',
            esActual && 'ring-4 ring-masi-blue-50',
          )} />
        </li>;
      })}
    </ol>

    {etapa && <p className="mt-2 text-sm font-semibold text-masi-blue">
      {etapa}
      <span className="sr-only">{`: etapa ${actual + 1} de ${ETAPAS_DEL_SERVICIO.length}`}</span>
    </p>}
  </div>;
}
