import type { Job } from '../../../shared/escrow';
import type { Tag } from './mockEscrow';

/**
 * Toda la decisión de qué ve y qué puede hacer cada rol en cada estado, sin React.
 * JobScreen solo pinta lo que devuelve `vistaDelTrabajo`; si aquí no está, no se muestra.
 * El usuario nunca lee el nombre interno del estado: para eso está `ETIQUETA`.
 */
export type JobRole = 'client' | 'provider';

/**
 * Acciones que se ofrecen como botón. `autoRelease` no está aquí a propósito: el
 * contrato necesita que alguien firme esa transacción, pero para el usuario la
 * liberación por vencimiento es automática y no una tarea suya. Ver `vencido`.
 */
export type JobActionId = 'accept' | 'fund' | 'start' | 'submit' | 'approve' | 'dispute';

export interface JobCta {
  id: JobActionId;
  label: string;
}

export interface JobView {
  /** Estado en lenguaje de persona, para el chip. */
  etiqueta: string;
  titulo: string;
  detalle: string;
  principal: JobCta | null;
  secundaria: JobCta | null;
  esperando: boolean;
  requiereAccion: boolean;
  activo: boolean;
  terminal: boolean;
  /** Momento en que el pago se libera solo, cuando el estado lo contempla. */
  liberaSolo: bigint | null;
  vencido: boolean;
}

export const ESTADOS_ACTIVOS: readonly Tag[] = ['Requested', 'Accepted', 'Funded', 'Started', 'Submitted', 'Disputed'];
export const ESTADOS_TERMINALES: readonly Tag[] = ['Released', 'Resolved', 'Cancelled'];

/** Nunca se muestra el nombre interno del estado. */
export const ETIQUETA: Record<Tag, string> = {
  Requested: 'Esperando confirmación',
  Accepted: 'Pago pendiente',
  Funded: 'Pago protegido',
  Started: 'Servicio en curso',
  Submitted: 'Pendiente de revisión',
  Released: 'Servicio completado',
  Disputed: 'Problema en revisión',
  Resolved: 'Problema resuelto',
  Cancelled: 'Servicio cancelado',
};

/**
 * Las etapas que una persona reconoce, que son menos que los estados del contrato.
 *
 * Nueve estados en una barra no se leen en un teléfono, así que varios comparten etapa y
 * el matiz lo pone la etiqueta: `Funded` y `Started` están los dos en «En servicio», pero
 * uno dice «Pago protegido» y el otro «Servicio en curso», y solo el segundo la marca
 * como empezada. Ninguna etapa se da por cumplida antes de tiempo: con `Requested` no hay
 * ni una, porque el profesional todavía tiene que confirmar.
 */
export const ETAPAS_DEL_SERVICIO = ['Confirmación', 'Pago protegido', 'En servicio', 'Revisión', 'Completado'] as const;

export interface ProgresoDelServicio {
  /** Etapas ya cumplidas, de izquierda a derecha. */
  hechas: number;
  /** Cuál es el momento actual; -1 cuando no hay línea que recorrer. */
  actual: number;
  /** La etapa actual ya arrancó, no solo es la siguiente que toca. */
  enMarcha: boolean;
  /** Estado en lenguaje de persona: el mismo chip de siempre, nunca el del contrato. */
  etiqueta: string;
  /**
   * Lo que se sale de la línea. Una disputa o una cancelación no son un paso más del
   * camino feliz, y pintarlas dentro sería engañoso: se muestran aparte.
   */
  incidencia: 'revision' | 'cerrado' | null;
}

const PROGRESO: Record<Tag, Omit<ProgresoDelServicio, 'etiqueta'>> = {
  Requested: { hechas: 0, actual: 0, enMarcha: false, incidencia: null },
  Accepted: { hechas: 1, actual: 1, enMarcha: false, incidencia: null },
  Funded: { hechas: 2, actual: 2, enMarcha: false, incidencia: null },
  Started: { hechas: 2, actual: 2, enMarcha: true, incidencia: null },
  Submitted: { hechas: 3, actual: 3, enMarcha: true, incidencia: null },
  Released: { hechas: 5, actual: 4, enMarcha: true, incidencia: null },
  Disputed: { hechas: 0, actual: -1, enMarcha: false, incidencia: 'revision' },
  Resolved: { hechas: 0, actual: -1, enMarcha: false, incidencia: 'cerrado' },
  Cancelled: { hechas: 0, actual: -1, enMarcha: false, incidencia: 'cerrado' },
};

export function progresoDelServicio(job: Job): ProgresoDelServicio {
  const tag = job.state.tag;
  const fila = PROGRESO[tag] ?? { hechas: 0, actual: -1, enMarcha: false, incidencia: null };
  return { ...fila, etiqueta: ETIQUETA[tag] ?? 'Trabajo' };
}

export const esActivo = (job: Job): boolean => ESTADOS_ACTIVOS.includes(job.state.tag);
export const esTerminal = (job: Job): boolean => ESTADOS_TERMINALES.includes(job.state.tag);

/** Cuándo se libera el pago solo. Null si el trabajo no está esperando revisión. */
export function liberaSolo(job: Job): bigint | null {
  if (job.state.tag !== 'Submitted' || job.submitted_at === undefined) return null;
  return job.submitted_at + job.review_secs;
}

export function puedeLiberarseSolo(job: Job, ahora: bigint): boolean {
  const limite = liberaSolo(job);
  return limite !== null && ahora >= limite;
}

const TENGO_UN_PROBLEMA: JobCta = { id: 'dispute', label: 'Tengo un problema' };

/**
 * `contraparte` es el nombre de la otra persona, para no escribir «el profesional» cuando
 * sabemos cómo se llama. `ahora` entra por parámetro para que la vista sea comprobable.
 */
export function vistaDelTrabajo(
  job: Job,
  role: JobRole,
  opciones: { contraparte: string; ahora?: bigint } = { contraparte: '' },
): JobView {
  const otro = opciones.contraparte.trim() || (role === 'client' ? 'el profesional' : 'el cliente');
  const ahora = opciones.ahora ?? BigInt(Math.floor(Date.now() / 1000));
  const tag = job.state.tag;
  const vencido = puedeLiberarseSolo(job, ahora);

  const base = {
    etiqueta: ETIQUETA[tag] ?? 'Trabajo',
    activo: esActivo(job),
    terminal: esTerminal(job),
    liberaSolo: liberaSolo(job),
    vencido,
  };
  const armar = (parte: Omit<JobView, keyof typeof base | 'esperando' | 'requiereAccion'>): JobView => ({
    ...base,
    ...parte,
    esperando: parte.principal === null && base.activo,
    requiereAccion: parte.principal !== null && base.activo,
  });

  if (tag === 'Requested') {
    return role === 'provider'
      ? armar({
        titulo: 'Cotización aceptada',
        detalle: `${otro} aceptó tu cotización. Confirma el trabajo para continuar.`,
        principal: { id: 'accept', label: 'Confirmar trabajo' },
        secundaria: null,
      })
      : armar({
        titulo: 'Cotización aceptada',
        detalle: `Estamos esperando que ${otro} confirme el trabajo para continuar con el pago protegido.`,
        principal: null,
        secundaria: null,
      });
  }

  if (tag === 'Accepted') {
    return role === 'client'
      ? armar({
        titulo: 'Profesional confirmado',
        detalle: `${otro} confirmó el trabajo. Tu pago estará protegido durante el servicio.`,
        principal: { id: 'fund', label: 'Realizar pago protegido' },
        secundaria: null,
      })
      : armar({
        titulo: 'Trabajo confirmado',
        detalle: `Esperando que ${otro} realice el pago protegido.`,
        principal: null,
        secundaria: null,
      });
  }

  if (tag === 'Funded') {
    return role === 'provider'
      ? armar({
        titulo: 'Pago protegido',
        detalle: `${otro} ya aseguró el pago. Puedes comenzar el servicio.`,
        principal: { id: 'start', label: 'Iniciar servicio' },
        secundaria: null,
      })
      : armar({
        titulo: 'Pago protegido',
        detalle: `Tu dinero está protegido. Esperando que ${otro} inicie el servicio.`,
        principal: null,
        secundaria: null,
      });
  }

  if (tag === 'Started') {
    return role === 'provider'
      ? armar({
        titulo: 'Servicio en curso',
        detalle: 'Cuando hayas terminado, márcalo para que el cliente lo revise.',
        principal: { id: 'submit', label: 'Marcar como terminado' },
        secundaria: TENGO_UN_PROBLEMA,
      })
      : armar({
        titulo: 'Servicio en curso',
        detalle: `${otro} está realizando el trabajo.`,
        principal: null,
        secundaria: TENGO_UN_PROBLEMA,
      });
  }

  if (tag === 'Submitted') {
    if (role === 'client') {
      return armar({
        titulo: 'Trabajo terminado',
        detalle: `${otro} indicó que terminó el servicio. Revisa el trabajo antes de aprobarlo.`,
        principal: { id: 'approve', label: 'Aprobar servicio' },
        secundaria: TENGO_UN_PROBLEMA,
      });
    }
    return armar({
      titulo: 'Trabajo enviado',
      detalle: vencido
        ? `${otro} no respondió dentro del plazo. Tu pago se libera automáticamente.`
        : `Esperando la aprobación de ${otro}.`,
      principal: null,
      secundaria: TENGO_UN_PROBLEMA,
    });
  }

  if (tag === 'Released') {
    return role === 'client'
      ? armar({
        titulo: 'Servicio completado',
        detalle: job.rated
          ? 'Gracias por calificar este servicio.'
          : `El pago se liberó a ${otro}.`,
        principal: null,
        secundaria: null,
      })
      : armar({
        titulo: 'Servicio completado',
        detalle: 'Recibiste el pago de este trabajo.',
        principal: null,
        secundaria: null,
      });
  }

  if (tag === 'Disputed') {
    return armar({
      titulo: 'Problema reportado',
      detalle: 'Este servicio está en revisión. El caso está pendiente de resolución.',
      principal: null,
      secundaria: null,
    });
  }

  if (tag === 'Resolved') {
    return armar({
      titulo: 'Problema resuelto',
      detalle: 'La revisión terminó y el caso quedó cerrado.',
      principal: null,
      secundaria: null,
    });
  }

  if (tag === 'Cancelled') {
    return armar({
      titulo: 'Servicio cancelado',
      detalle: 'Este trabajo se canceló.',
      principal: null,
      secundaria: null,
    });
  }

  // Estado desconocido: se informa sin romper la pantalla.
  return armar({
    titulo: 'Trabajo',
    detalle: 'Este trabajo está en un estado que todavía no sabemos mostrar.',
    principal: null,
    secundaria: null,
  });
}

/**
 * Calificar lo hace el cliente, una sola vez y con el trabajo ya cerrado. Son las mismas
 * condiciones que exige el contrato, para no ofrecer algo que luego va a rebotar.
 */
export function puedeCalificar(job: Job, role: JobRole): boolean {
  if (role !== 'client' || job.rated) return false;
  return job.state.tag === 'Released' || job.state.tag === 'Resolved';
}

/**
 * Lo que el profesional lleva hecho, contado desde los trabajos reales.
 *
 * Solo cuentan los `Released`: son los únicos donde se sabe con certeza cuánto cobró
 * (`amount`, que es el adelanto de materiales más el saldo; la comisión la paga el
 * cliente aparte). Un `Resolved` terminó, pero el reparto del árbitro no está en el
 * `Job` del contrato, así que sumarlo sería inventar. Un `Cancelled` no movió dinero.
 */
export function resumenDelProfesional(jobs: readonly Job[]): { completados: number; ganado: bigint } {
  const cobrados = jobs.filter(job => job.state.tag === 'Released');
  return {
    completados: cobrados.length,
    ganado: cobrados.reduce((total, job) => total + job.amount, 0n),
  };
}

/** Un trabajo cuenta para el badge solo si está activo y la acción es de este rol. */
export function requiereAccionDe(job: Job, role: JobRole, ahora?: bigint): boolean {
  return vistaDelTrabajo(job, role, { contraparte: '', ahora }).requiereAccion;
}

export function trabajosPorAtender(jobs: readonly Job[], role: JobRole, ahora?: bigint): Job[] {
  return jobs.filter(job => requiereAccionDe(job, role, ahora));
}
