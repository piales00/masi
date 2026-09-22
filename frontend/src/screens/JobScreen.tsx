import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarClock, MapPin, ShieldCheck, Star, TriangleAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { cn } from '../cn';
import { fieldBox } from '../components/Field';
import { EXPLORER_TX } from '../config';
import { friendlyError } from '../contractErrors';
import { useDemo } from '../demo/DemoContext';
import { guardarIncidencia, leerIncidencia } from '../demo/incidencias';
import { escrow } from '../escrow';
import { puedeCalificar, puedeLiberarseSolo, vistaDelTrabajo } from '../escrow/jobs';
import type { JobActionId, JobRole } from '../escrow/jobs';
import { notificarCambioDeTrabajos } from '../escrow/useJobsPorAtender';
import { formatSoles } from '../money';
import { serviceOf } from '../trades';
import type { Job } from '../../../shared/escrow';

const fecha = (segundos: bigint): string =>
  new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    .format(new Date(Number(segundos) * 1000));

function Skeleton() {
  return <div className="space-y-3 px-4 py-6" aria-hidden="true">
    <div className="h-24 animate-pulse rounded-masi-card bg-masi-gray" />
    <div className="h-40 animate-pulse rounded-masi-card bg-masi-gray" />
    <div className="h-12 animate-pulse rounded-masi-input bg-masi-gray" />
  </div>;
}

function Aviso({ texto, onVolver }: { texto: string; onVolver: () => void }) {
  return <div className="px-4 py-10 text-center">
    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-masi-blue-50 text-masi-blue">
      <TriangleAlert size={26} aria-hidden="true" />
    </span>
    <p className="mt-4 text-base text-masi-text">{texto}</p>
    <Button variant="secondary" className="mt-6" onClick={onVolver}>Volver</Button>
  </div>;
}

/** Cada acción con su texto de espera; el botón nunca se queda mudo mientras trabaja. */
const EN_CURSO: Record<JobActionId, string> = {
  accept: 'Confirmando…',
  fund: 'Procesando…',
  start: 'Iniciando…',
  submit: 'Finalizando…',
  approve: 'Aprobando…',
  dispute: 'Enviando…',
};

/** Horas que le quedan al cliente para revisar, redondeadas hacia arriba. */
function horasRestantes(limite: bigint, ahora: bigint): number {
  return Math.max(1, Math.ceil(Number(limite - ahora) / 3600));
}

function Estrellas({ valor, onElegir, bloqueado }: { valor: number; onElegir?: (n: number) => void; bloqueado?: boolean }) {
  return <div className="flex gap-1" role={onElegir ? 'radiogroup' : undefined} aria-label={onElegir ? 'Estrellas' : undefined}>
    {[1, 2, 3, 4, 5].map(n => {
      const activa = n <= valor;
      const icono = <Star size={28} aria-hidden="true" className={activa ? 'fill-masi-orange text-masi-orange' : 'text-masi-gray'} />;
      if (!onElegir) return <span key={n}>{icono}</span>;
      return <button
        key={n}
        type="button"
        role="radio"
        aria-checked={valor === n}
        aria-label={n === 1 ? '1 estrella' : `${n} estrellas`}
        disabled={bloqueado}
        onClick={() => onElegir(n)}
        className="rounded-full p-0.5 disabled:opacity-60"
      >{icono}</button>;
    })}
  </div>;
}

function Linea({ etiqueta, valor, fuerte }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return <div className="flex items-baseline justify-between gap-3">
    <dt className={cn('text-masi-muted', fuerte && 'font-semibold text-masi-navy')}>{etiqueta}</dt>
    <dd className={cn('font-semibold text-masi-navy', fuerte && 'text-xl font-bold')}>{valor}</dd>
  </div>;
}

/**
 * Una sola pantalla para los dos roles: lo que cambia sale de `vistaDelTrabajo`, que es
 * lógica pura y comprobable. Aquí no se decide nada del flujo, solo se pinta.
 *
 * Los botones son todavía visuales: las llamadas al escrow llegan en el bloque siguiente.
 */
export function JobScreen({ role }: { role: JobRole }) {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { solicitudes, postulaciones, cotizaciones, profile, providerProfile } = useDemo();

  const [job, setJob] = useState<Job | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [error, setError] = useState('');
  const [enCurso, setEnCurso] = useState<JobActionId | 'rate' | null>(null);
  const [estrellas, setEstrellas] = useState(0);
  const [reportando, setReportando] = useState(false);
  const [motivo, setMotivo] = useState('');
  /** El cerrojo va en un ref: dos clics del mismo tick leerían el mismo estado en null. */
  const ocupado = useRef(false);

  const releer = useCallback(async (id: bigint) => {
    const encontrado = await escrow.getJob(id);
    setJob(encontrado);
    return encontrado;
  }, []);

  useEffect(() => {
    let vigente = true;
    setEstado('cargando');
    (async () => {
      try {
        if (!jobId || !/^\d+$/.test(jobId)) throw new Error('HostError: Error(Contract, #3)');
        const encontrado = await escrow.getJob(BigInt(jobId));
        if (!vigente) return;
        setJob(encontrado);
        setEstado('listo');
      } catch (cause) {
        if (!vigente) return;
        setError(friendlyError(cause));
        setEstado('error');
      }
    })();
    return () => { vigente = false; };
  }, [jobId]);

  /**
   * Vencido el plazo de revisión, el pago se libera solo. El contrato necesita que
   * alguien firme `auto_release`, pero eso es una necesidad técnica, no una tarea del
   * profesional: en producción lo dispara la plataforma. Aquí lo hace la app al abrir.
   */
  useEffect(() => {
    if (!job || ocupado.current) return;
    if (!puedeLiberarseSolo(job, BigInt(Math.floor(Date.now() / 1000)))) return;
    let vigente = true;
    ocupado.current = true;
    (async () => {
      try {
        await escrow.autoRelease(job.id, role === 'client' ? job.client : job.provider);
        if (vigente) await releer(job.id);
        notificarCambioDeTrabajos();
      } catch {
        // Si todavía no procede, la pantalla sigue mostrando el plazo tal cual.
      } finally {
        ocupado.current = false;
      }
    })();
    return () => { vigente = false; };
  }, [job, role, releer]);

  const ejecutar = async (accion: JobActionId) => {
    if (!job || ocupado.current) return;
    ocupado.current = true;
    setEnCurso(accion);
    setError('');
    try {
      // La firma real con huella entra aquí cuando exista el adaptador; ver el reporte.
      if (accion === 'accept') await escrow.accept(job.id);
      if (accion === 'fund') await escrow.fund(job.id);
      if (accion === 'start') await escrow.start(job.id);
      if (accion === 'submit') await escrow.submit(job.id);
      if (accion === 'approve') await escrow.approve(job.id);
      await releer(job.id);
      notificarCambioDeTrabajos();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      ocupado.current = false;
      setEnCurso(null);
    }
  };

  /**
   * El contrato exige que quien reporta sea parte del trabajo, y no guarda ningún texto:
   * el motivo queda solo como contexto local de la demo. Ver demo/incidencias.ts.
   */
  const reportar = async () => {
    if (!job || ocupado.current || !motivo.trim()) return;
    ocupado.current = true;
    setEnCurso('dispute');
    setError('');
    try {
      guardarIncidencia({
        jobId: job.id.toString(),
        reportadaPor: role,
        motivo: motivo.trim(),
        creadaEn: new Date().toISOString(),
      });
      await escrow.dispute(job.id, role === 'client' ? job.client : job.provider);
      await releer(job.id);
      notificarCambioDeTrabajos();
      setReportando(false);
      setMotivo('');
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      ocupado.current = false;
      setEnCurso(null);
    }
  };

  const calificar = async () => {
    if (!job || ocupado.current || estrellas < 1) return;
    ocupado.current = true;
    setEnCurso('rate');
    setError('');
    try {
      // Sin comentario todavía: se firma el hash del texto vacío. El texto llega en F5.
      const vacio = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(''));
      await escrow.rate(job.id, estrellas, new Uint8Array(vacio));
      await releer(job.id);
      notificarCambioDeTrabajos();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      ocupado.current = false;
      setEnCurso(null);
    }
  };

  const volver = () => navigate(role === 'client' ? '/solicitudes' : '/profesional/solicitudes');

  if (estado === 'cargando') {
    return <Screen header={<ScreenHeader title="Tu trabajo" />}><Skeleton /></Screen>;
  }
  if (estado === 'error' || !job) {
    return <Screen header={<ScreenHeader title="Tu trabajo" />}>
      <Aviso texto={error || 'No encontramos ese trabajo.'} onVolver={volver} />
    </Screen>;
  }

  // Datos de la demo que acompañan al trabajo. Los de muestra no los tienen, y no pasa nada.
  const cotizacion = cotizaciones.find(item => item.jobId === job.id.toString());
  const solicitud = solicitudes.find(item => item.id === cotizacion?.solicitudId);
  const postulacion = postulaciones.find(item => item.id === cotizacion?.postulacionId);

  const nombreProfesional = postulacion?.providerNombre ?? providerProfile?.fullName ?? '';
  const nombreCliente = solicitud?.cliente || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  const contraparte = role === 'client' ? nombreProfesional : nombreCliente;

  const vista = vistaDelTrabajo(job, role, { contraparte });
  const incidencia = leerIncidencia(job.id.toString());
  const servicio = solicitud ? serviceOf(solicitud.servicio) : null;
  const Icon = servicio?.icon;
  const pagoDelCliente = job.amount + job.fee_amount;
  const ubicacion = [solicitud?.distrito, solicitud?.ubicacion].filter(Boolean).join(' · ');

  return <Screen header={<ScreenHeader title="Tu trabajo" subtitle={solicitud?.servicio} />}>
    <div className="px-4 py-6">
      <section className="rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          {Icon && solicitud
            ? <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-masi-blue">
              <Icon size={15} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 break-words">{solicitud.servicio}</span>
            </p>
            : <span />}
          <span className="max-w-full rounded-full bg-masi-blue-50 px-3 py-1 text-xs font-semibold break-words text-masi-navy">
            {vista.etiqueta}
          </span>
        </div>

        <h2 className="mt-3 text-lg font-bold text-masi-navy">{vista.titulo}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-masi-text">{vista.detalle}</p>

        {contraparte && <p className="mt-3 border-t border-masi-gray pt-3 text-sm text-masi-muted">
          {role === 'client' ? 'Profesional' : 'Cliente'}: <strong className="font-semibold text-masi-navy">{contraparte}</strong>
        </p>}
      </section>

      <section className="mt-4 rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <h2 className="text-sm font-semibold text-masi-navy">El trabajo</h2>
        <p className="mt-2 text-sm leading-relaxed text-masi-text">{job.description}</p>

        {solicitud && solicitud.fotos.length > 0 && <ul className="mt-3 grid grid-cols-3 gap-2">
          {solicitud.fotos.map((foto, index) => <li key={index}>
            <img src={foto} alt={`Foto ${index + 1} del trabajo`} className="aspect-square w-full rounded-masi-input border border-masi-gray object-cover" />
          </li>)}
        </ul>}

        {/* El profesional ya fue elegido y ya visitó: aquí la dirección exacta le corresponde. */}
        {ubicacion && <p className="mt-3 flex items-start gap-1.5 border-t border-masi-gray pt-3 text-sm text-masi-muted">
          <MapPin size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{ubicacion}</span>
        </p>}
      </section>

      <section className="mt-4 rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <h2 className="text-sm font-semibold text-masi-navy">Cotización acordada</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Linea etiqueta="Total del trabajo" valor={formatSoles(job.amount)} />
          <Linea etiqueta="Materiales, se entregan al iniciar" valor={formatSoles(job.materials_amount)} />
          {role === 'client'
            ? <>
              <Linea etiqueta={`Comisión Masi (${job.fee_bps / 100} %)`} valor={formatSoles(job.fee_amount)} />
              <div className="border-t border-masi-gray pt-2">
                <Linea etiqueta="Pagarás" valor={formatSoles(pagoDelCliente)} fuerte />
              </div>
            </>
            : <div className="border-t border-masi-gray pt-2">
              <Linea etiqueta="Recibes en total" valor={formatSoles(job.amount)} fuerte />
            </div>}
        </dl>

        {vista.activo && <p className="mt-3 flex items-start gap-2 rounded-masi-input bg-masi-blue-50 p-3 text-xs leading-relaxed text-masi-navy">
          <ShieldCheck size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>El dinero queda protegido hasta que el cliente apruebe el trabajo.</span>
        </p>}
      </section>

      {vista.liberaSolo !== null && <p className={cn(
        'mt-4 flex items-start gap-2 rounded-masi-input p-3 text-sm leading-relaxed',
        vista.vencido ? 'bg-masi-cream text-masi-navy' : 'bg-masi-blue-50 text-masi-navy',
      )}>
        <CalendarClock size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>{vista.vencido
          ? 'El plazo de revisión terminó. El pago se libera automáticamente.'
          : role === 'client'
            ? `Puedes revisar el trabajo hasta el ${fecha(vista.liberaSolo)}. Te quedan unas ${horasRestantes(vista.liberaSolo, BigInt(Math.floor(Date.now() / 1000)))} horas.`
            : `Si el cliente no responde, el pago se libera solo el ${fecha(vista.liberaSolo)}.`}</span>
      </p>}

      {job.state.tag === 'Disputed' && incidencia && <section className="mt-4 rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <h2 className="text-sm font-semibold text-masi-navy">Lo que se reportó</h2>
        <p className="mt-2 text-sm leading-relaxed text-masi-text">{incidencia.motivo}</p>
        <p className="mt-2 text-xs text-masi-muted">
          Reportado por {incidencia.reportadaPor === 'client' ? 'el cliente' : 'el profesional'}.
        </p>
      </section>}

      {puedeCalificar(job, role) && <section className="mt-4 rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <h2 className="text-base font-bold text-masi-navy">¿Cómo fue tu experiencia con {contraparte || 'el profesional'}?</h2>
        <div className="mt-3 flex justify-center">
          <Estrellas valor={estrellas} onElegir={setEstrellas} bloqueado={enCurso !== null} />
        </div>
        <Button className="mt-4" disabled={estrellas < 1 || enCurso !== null} onClick={calificar}>
          {enCurso === 'rate' ? 'Enviando…' : 'Enviar calificación'}
        </Button>
      </section>}

      {job.rated && role === 'client' && <section className="mt-4 rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <h2 className="text-sm font-semibold text-masi-navy">Tu calificación</h2>
        <div className="mt-3 flex justify-center"><Estrellas valor={job.stars} /></div>
      </section>}

      {error && <p role="alert" className="mt-4 rounded-masi-input bg-masi-blue-50 p-3 text-sm text-masi-navy">{error}</p>}

      {(vista.principal || vista.secundaria) && <div className="mt-6">
        {vista.principal && <Button
          disabled={enCurso !== null}
          onClick={() => { void ejecutar(vista.principal!.id); }}
        >{enCurso === vista.principal.id ? EN_CURSO[vista.principal.id] : vista.principal.label}</Button>}

        {vista.secundaria && !reportando && <Button
          variant="secondary"
          className="mt-3"
          disabled={enCurso !== null}
          onClick={() => { setReportando(true); setError(''); }}
        >{vista.secundaria.label}</Button>}

        {vista.secundaria && reportando && <section className="mt-3 rounded-masi-card border border-masi-gray bg-white p-4">
          <h2 className="text-base font-bold text-masi-navy">¿Qué pasó?</h2>
          <p className="mt-1 text-sm text-masi-muted">
            Cuéntanos el problema. El servicio queda en revisión y el pago no se libera mientras tanto.
          </p>
          <label className="mt-3 block">
            <span className="sr-only">Describe el problema</span>
            <textarea
              value={motivo}
              onChange={event => setMotivo(event.target.value.slice(0, 300))}
              rows={4}
              placeholder="Ej. El trabajo quedó a medias y no pude comunicarme."
              className={cn(fieldBox, 'resize-none py-3')}
            />
          </label>
          <Button className="mt-3" disabled={!motivo.trim() || enCurso !== null} onClick={reportar}>
            {enCurso === 'dispute' ? EN_CURSO.dispute : 'Reportar problema'}
          </Button>
          <Button
            variant="secondary"
            className="mt-2"
            disabled={enCurso !== null}
            onClick={() => { setReportando(false); setMotivo(''); }}
          >Cancelar</Button>
        </section>}
      </div>}

      <details className="mt-6 rounded-masi-card border border-masi-gray bg-white p-4 text-sm text-masi-navy">
        <summary className="cursor-pointer font-semibold">Ver detalles</summary>
        <p className="mt-3 text-xs text-masi-muted">Número de trabajo</p>
        <p className="font-mono text-xs">{job.id.toString()}</p>
        <p className="mt-3 text-xs text-masi-muted">Creado</p>
        <p className="text-xs">{job.created_at > 0n ? fecha(job.created_at) : 'Sin fecha'}</p>
        {cotizacion?.txHash && <a
          className="mt-3 block break-all text-xs text-masi-blue underline"
          href={`${EXPLORER_TX}${cotizacion.txHash}`}
          target="_blank"
          rel="noreferrer"
        >Ver comprobante</a>}
      </details>
    </div>
  </Screen>;
}
