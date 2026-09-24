import { useRef, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Fingerprint, MapPin, Search, ShieldCheck, Star } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AvatarProfesional } from '../components/AvatarProfesional';
import { Button } from '../components/Button';
import { FotosDeSolicitud } from '../components/FotosDeSolicitud';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { cn } from '../cn';
import { friendlyError } from '../contractErrors';
import { readPendingAcceptance, useDemo, writePendingAcceptance } from '../demo/DemoContext';
import type { Cotizacion, Postulacion } from '../demo/DemoContext';
import { escrow } from '../escrow';
import { confirmDemoIdentity } from '../passkeys';
import { formatSoles, portion } from '../money';
import { formatPrice, formatRating } from '../marketplace';
import type { RatingSummary } from '../../../shared/escrow';
import { serviceOf } from '../trades';
import { useMarketplace } from '../useMarketplace';
import { useProviderRatings } from '../useProviderRatings';

/** Solo hay calificación si el profesional existe en el catálogo; si no, es nuevo. */
/** Sin reseñas es "Nuevo en Masi", venga del catálogo o de la cadena. */
function ratingTexto(rating: RatingSummary | null, ready: boolean): string | null {
  if (!ready) return null;
  return rating && rating.rating_count > 0 ? formatRating(rating) : 'Nuevo en Masi';
}

/** Mismo reparto que hizo el profesional, recalculado igual que lo hará el contrato. */
function desglose(cotizacion: Cotizacion) {
  const total = BigInt(cotizacion.totalStroops);
  return {
    total,
    comision: portion(total, cotizacion.feeBps),
    adelanto: portion(total, cotizacion.materialsBps),
  };
}

export function RequestDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, clienteId, solicitudes, postulaciones, cotizaciones, chooseProposal, acceptQuote, rejectQuote } = useDemo();
  const activeAccount = useRef(profile?.contractId);
  activeAccount.current = profile?.contractId;
  const { status, items } = useMarketplace();
  const [procesando, setProcesando] = useState(false);
  const [errorCotizacion, setErrorCotizacion] = useState('');
  /**
   * El cerrojo va en un ref, no en el estado: dos clics del mismo tick leerían el mismo
   * `procesando` en false y firmarían dos veces, creando dos trabajos para una cotización.
   */
  const enCurso = useRef(false);
  /** Antes del `return` temprano: los hooks no pueden ir detrás de una condición. */
  const cadena = useProviderRatings(
    postulaciones.filter(item => item.solicitudId === id).map(item => item.providerAddress),
  );

  const solicitud = solicitudes.find(item => item.id === id && item.clienteId === clienteId);
  if (!solicitud) return <Navigate to="/solicitudes" replace />;

  const propuestas = postulaciones.filter(item => item.solicitudId === solicitud.id);
  const elegida = propuestas.find(item => item.id === solicitud.postulacionElegidaId);
  const service = serviceOf(solicitud.servicio);
  const Icon = service.icon;

  const elegir = async (postulacion: Postulacion) => {
    if (enCurso.current) return;
    enCurso.current = true;
    setProcesando(true);
    setErrorCotizacion('');
    try {
      await chooseProposal(solicitud.id, postulacion.id);
    } catch (cause) {
      setErrorCotizacion(friendlyError(cause));
    } finally {
      enCurso.current = false;
      setProcesando(false);
    }
  };

  // Una rechazada deja de estar activa: solo la enviada espera respuesta del cliente.
  const cotizacion = cotizaciones.find(item => item.solicitudId === solicitud.id && item.estado === 'enviada');
  const aceptada = cotizaciones.find(item => item.solicitudId === solicitud.id && item.estado === 'aceptada');
  const cifras = cotizacion ? desglose(cotizacion) : null;
  const contratado = aceptada ? desglose(aceptada) : null;
  const horasRevision = cotizacion ? Math.round(cotizacion.reviewSecs / 3600) : 0;
  const nombreElegido = elegida?.providerNombre ?? 'el profesional';
  // Elegidas las propuestas ya cumplieron su función: a partir de la cotización estorban.
  const mostrarPropuestas = solicitud.estado !== 'cotizada' && solicitud.estado !== 'contratada';

  /**
   * createJob solo puede ocurrir una vez. Si la firma salió bien y el guardado falló,
   * el recibo queda en localStorage y al reintentar se retoma desde ahí.
   */
  const aceptar = async () => {
    if (!cotizacion || enCurso.current) return;
    enCurso.current = true;
    setProcesando(true);
    setErrorCotizacion('');
    try {
      const expected = profile?.contractId;
      if (!expected || expected !== cotizacion.clienteId) throw new Error('HostError: Error(Contract, #5)');
      await confirmDemoIdentity(expected);
      if (activeAccount.current !== expected) throw new Error('HostError: Error(Contract, #5)');
      const pendiente = readPendingAcceptance();
      let jobId: string;
      let txHash: string;

      if (pendiente && pendiente.cotizacionId === cotizacion.id) {
        jobId = pendiente.jobId;
        txHash = pendiente.txHash;
      } else {
        const recibo = await escrow.createJob({
          // Pedido simulado, autorizado con una comprobación nueva de identidad.
          client: clienteId,
          provider: cotizacion.providerAddress,
          amount: BigInt(cotizacion.totalStroops),
          materials_bps: cotizacion.materialsBps,
          fee_bps: cotizacion.feeBps,
          review_secs: BigInt(cotizacion.reviewSecs),
          description: cotizacion.descripcion,
        }, cotizacion.id);
        jobId = String(recibo.jobId);
        txHash = recibo.hash;
        writePendingAcceptance({ cotizacionId: cotizacion.id, jobId, txHash });
      }

      await acceptQuote(cotizacion.id, jobId, txHash);
      navigate(`/trabajos/${jobId}`);
    } catch (err) {
      setErrorCotizacion(friendlyError(err));
    } finally {
      enCurso.current = false;
      setProcesando(false);
    }
  };

  const rechazar = async () => {
    if (!cotizacion || enCurso.current) return;
    enCurso.current = true;
    setProcesando(true);
    setErrorCotizacion('');
    try {
      await rejectQuote(cotizacion.id);
    } catch (err) {
      setErrorCotizacion(friendlyError(err));
    } finally {
      enCurso.current = false;
      setProcesando(false);
    }
  };

  return <Screen header={<ScreenHeader title="Tu solicitud" subtitle={solicitud.servicio} />}>
    <div className="px-4 py-6">
      <section className="rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-masi-blue">
          <Icon size={15} aria-hidden="true" />{solicitud.servicio}
        </p>
        <p className="mt-3 text-base leading-relaxed text-masi-text">{solicitud.descripcion}</p>

        <FotosDeSolicitud solicitudId={solicitud.id} cantidad={solicitud.fotos} etiqueta="de la solicitud" />

        <dl className="mt-4 space-y-2 border-t border-masi-gray pt-3 text-sm text-masi-muted">
          <div className="flex items-center gap-1.5">
            <dt><MapPin size={14} aria-hidden="true" /><span className="sr-only">Dónde</span></dt>
            <dd>{[solicitud.distrito, solicitud.ubicacion].filter(Boolean).join(' · ')}</dd>
          </div>
          {solicitud.cuando && <div className="flex items-center gap-1.5">
            <dt><CalendarClock size={14} aria-hidden="true" /><span className="sr-only">Cuándo</span></dt>
            <dd>{solicitud.cuando}</dd>
          </div>}
        </dl>
      </section>

      {cotizacion && cifras && <section className="mt-4 rounded-masi-card border border-masi-blue bg-white p-4 shadow-masi-sm">
        <h2 className="text-base font-bold text-masi-navy">Cotización de {nombreElegido}</h2>

        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-masi-muted">Total del trabajo</dt>
            <dd className="font-semibold text-masi-navy">{formatSoles(cifras.total)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-masi-muted">Materiales, se entregan al iniciar</dt>
            <dd className="font-semibold text-masi-navy">{formatSoles(cifras.adelanto)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-masi-muted">Comisión Masi (5 %)</dt>
            <dd className="font-semibold text-masi-navy">{formatSoles(cifras.comision)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t border-masi-gray pt-2">
            <dt className="font-semibold text-masi-navy">Pagarás</dt>
            <dd className="text-xl font-bold text-masi-navy">{formatSoles(cifras.total + cifras.comision)}</dd>
          </div>
        </dl>

        <p className="mt-3 flex items-start gap-2 rounded-masi-input bg-masi-blue-50 p-3 text-xs leading-relaxed text-masi-navy">
          <ShieldCheck size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>
            Tu dinero queda protegido. {nombreElegido} recibe el resto cuando apruebes el trabajo,
            o {horasRevision} horas después de que lo marque como terminado si no respondes.
          </span>
        </p>

        <p className="mt-3 text-xs text-masi-muted">{nombreElegido} confirmará y luego pagas.</p>

        {errorCotizacion && <p className="mt-3 rounded-masi-input bg-masi-blue-50 p-3 text-sm text-masi-navy" role="alert">{errorCotizacion}</p>}

        <Button className="mt-4" disabled={procesando} onClick={aceptar}>
          <Fingerprint size={18} aria-hidden="true" />
          {procesando ? 'Confirmando…' : 'Aceptar cotización'}
        </Button>
        <p className="mt-2 text-center text-xs text-masi-muted">Confirma con tu huella o el bloqueo de tu celular.</p>
        <Button variant="secondary" className="mt-3" disabled={procesando} onClick={rechazar}>Rechazar</Button>
      </section>}

      {aceptada && contratado && <section className="mt-4 rounded-masi-card border border-masi-success bg-white p-4 shadow-masi-sm">
        <h2 className="flex items-center gap-2 text-base font-bold text-masi-navy">
          <CheckCircle2 size={18} aria-hidden="true" className="shrink-0 text-masi-success" />
          Contrataste a {nombreElegido}
        </h2>

        <dl className="mt-3 flex items-baseline justify-between gap-3 border-t border-masi-gray pt-3 text-sm">
          <dt className="font-semibold text-masi-navy">Pagarás</dt>
          <dd className="text-xl font-bold text-masi-navy">{formatSoles(contratado.total + contratado.comision)}</dd>
        </dl>

        <p className="mt-3 flex items-start gap-2 rounded-masi-input bg-masi-green-50 p-3 text-xs leading-relaxed text-masi-navy">
          <ShieldCheck size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          Tu pago quedó protegido. Se libera cuando apruebes el trabajo.
        </p>

        {aceptada.jobId && <Button className="mt-4" onClick={() => navigate(`/trabajos/${aceptada.jobId}`)}>Ver trabajo</Button>}
      </section>}

      {elegida && !cotizacion && !aceptada && <p className="mt-4 flex items-start gap-2 rounded-masi-input border border-masi-success bg-masi-green-50 p-3 text-sm text-masi-navy" role="status">
        <CheckCircle2 size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-masi-success" />
        Elegiste a {elegida.providerNombre}. Estamos esperando su cotización final.
      </p>}

      {mostrarPropuestas && <section className="mt-8" aria-labelledby="propuestas">
        <h2 id="propuestas" className="text-lg font-bold text-masi-navy">Propuestas recibidas</h2>

        {propuestas.length === 0
          ? <div className="mt-4 rounded-masi-card border border-dashed border-masi-gray bg-white px-6 py-10 text-center">
            <Search size={30} aria-hidden="true" className="mx-auto text-masi-blue" />
            <p className="mt-3 text-sm font-semibold text-masi-navy">Buscando profesionales</p>
            <p className="mt-1 text-sm text-masi-muted">Todavía no recibiste propuestas. Aquí aparecerán apenas alguien postule.</p>
          </div>
          : <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {propuestas.map(propuesta => {
              const ficha = items.find(item => item.id === propuesta.providerId);
              const resumen = ficha?.rating ?? cadena.get(propuesta.providerAddress ?? '') ?? null;
              const rating = ratingTexto(resumen, status === 'ready');
              const esElegida = propuesta.id === solicitud.postulacionElegidaId;
              const descartada = Boolean(elegida) && !esElegida;

              return <li
                key={propuesta.id}
                className={cn(
                  'rounded-masi-card border bg-white p-4 shadow-masi-sm',
                  esElegida ? 'border-masi-success' : 'border-masi-gray',
                  descartada && 'opacity-60',
                )}
              >
                <div className="flex items-start gap-3">
                  <AvatarProfesional providerId={propuesta.providerId} nombre={propuesta.providerNombre} tint={service.tint} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-masi-navy">{propuesta.providerNombre}</h3>
                    {rating && <p className="mt-0.5 flex items-center gap-1.5 text-sm text-masi-muted">
                      {resumen && resumen.rating_count > 0 && <Star size={14} aria-hidden="true" className="text-masi-navy" />}
                      {rating}
                    </p>}
                  </div>
                  <p className="shrink-0 text-base font-bold text-masi-navy">{formatPrice(propuesta.precio)}</p>
                </div>

                <p className="mt-3 flex items-center gap-1.5 border-t border-masi-gray pt-3 text-xs text-masi-muted">
                  <Clock3 size={14} aria-hidden="true" />Llega en {propuesta.minutos} min
                </p>

                {esElegida
                  ? <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-masi-success">
                    <CheckCircle2 size={16} aria-hidden="true" />Profesional elegido
                  </p>
                  : <div className="mt-3 flex flex-col gap-2">
                    <Button disabled={descartada || procesando} onClick={() => { void elegir(propuesta); }}>
                      {procesando ? 'Enviando…' : `Elegir a ${propuesta.providerNombre}`}
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(`/solicitudes/${solicitud.id}/propuesta/${propuesta.id}`)}>
                      Ver perfil
                    </Button>
                  </div>}
              </li>;
            })}
          </ul>}
      </section>}
    </div>
  </Screen>;
}
