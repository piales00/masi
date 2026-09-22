import { useEffect, useState } from 'react';
import { CalendarClock, MapPin, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { cn } from '../cn';
import { EXPLORER_TX } from '../config';
import { friendlyError } from '../contractErrors';
import { useDemo } from '../demo/DemoContext';
import { escrow } from '../escrow';
import { vistaDelTrabajo } from '../escrow/jobs';
import type { JobRole } from '../escrow/jobs';
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
          ? `El plazo de revisión terminó el ${fecha(vista.liberaSolo)}. El pago ya se puede cobrar.`
          : `Si el cliente no responde, el pago se libera solo el ${fecha(vista.liberaSolo)}.`}</span>
      </p>}

      {(vista.principal || vista.secundaria) && <div className="mt-6">
        {vista.principal && <Button disabled>{vista.principal.label}</Button>}
        {vista.secundaria && <Button variant="secondary" className="mt-3" disabled>{vista.secundaria.label}</Button>}
        <p className="mt-2 text-center text-xs text-masi-muted">Disponible en el siguiente avance.</p>
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
