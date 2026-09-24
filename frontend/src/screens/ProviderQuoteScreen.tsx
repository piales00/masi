import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Info, Send, TriangleAlert } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Field, fieldBox } from '../components/Field';
import { Screen } from '../components/Screen';
import { ScreenFooter } from '../components/ScreenFooter';
import { ScreenHeader } from '../components/ScreenHeader';
import { cn } from '../cn';
import { DEFAULT_REVIEW_SECS, FEE_BPS } from '../config';
import { useDemo } from '../demo/DemoContext';
import { formatSoles, materialsBpsOf, portion, solesToStroops } from '../money';

const MAX_DESCRIPTION_BYTES = 1024;
const bytesDe = (texto: string): number => new TextEncoder().encode(texto).length;

/** Devuelve null en lugar de lanzar mientras el técnico todavía está escribiendo. */
function aStroops(texto: string): bigint | null {
  try {
    return solesToStroops(texto);
  } catch {
    return null;
  }
}

export function ProviderQuoteScreen() {
  const { solicitudId } = useParams();
  const navigate = useNavigate();
  const { providerProfile, clienteId, solicitudes, postulaciones, sendQuote, cargando } = useDemo();

  const solicitud = solicitudes.find(item => item.id === solicitudId);
  const elegida = postulaciones.find(item => item.id === solicitud?.postulacionElegidaId);
  const esMia = Boolean(elegida && providerProfile && elegida.providerId === providerProfile.id);

  const [total, setTotal] = useState('');
  const [materiales, setMateriales] = useState('');
  const [descripcion, setDescripcion] = useState(solicitud?.descripcion ?? '');
  const [enviando, setEnviando] = useState(false);
  /** Si la descripción ya estaba en el primer render, `useState` la puso y no hay más que hacer. */
  const sembrada = useRef(Boolean(solicitud?.descripcion));

  /*
   * La solicitud puede llegar después del primer render —abrir esta pantalla desde el
   * aviso de «te eligieron» con el almacén compartido todavía respondiendo—, y entonces
   * el borrador se quedaba vacío. Se siembra una sola vez y solo si el campo sigue
   * intacto: lo que el profesional haya escrito no se pisa nunca, ni por una vuelta del
   * polling ni por un rerender.
   */
  useEffect(() => {
    const texto = solicitud?.descripcion;
    if (sembrada.current || !texto) return;
    sembrada.current = true;
    setDescripcion(actual => (actual === '' ? texto : actual));
  }, [solicitud?.descripcion]);

  /*
   * Mientras el almacén no ha contestado, que la solicitud no esté en la lista no
   * significa que no exista. Mandar a Solicitudes en ese instante echaba de esta pantalla
   * a quien abre el aviso con la pestaña recién cargada.
   */
  if (!solicitud && cargando) {
    return <Screen header={<ScreenHeader title="Cotización final" />}>
      <div aria-hidden="true" className="space-y-3 px-4 py-6">
        <div className="h-12 animate-pulse rounded-masi-input bg-masi-gray" />
        <div className="h-12 animate-pulse rounded-masi-input bg-masi-gray" />
        <div className="h-28 animate-pulse rounded-masi-input bg-masi-gray" />
      </div>
      <p role="status" className="sr-only">Cargando la solicitud…</p>
    </Screen>;
  }

  if (!solicitud || !elegida || !esMia) return <Navigate to="/profesional/solicitudes" replace />;

  const totalStroops = aStroops(total);
  const materialesStroops = materiales.trim() === '' ? 0n : aStroops(materiales);
  const bytes = bytesDe(descripcion);

  const totalValido = totalStroops !== null && totalStroops > 0n;
  const materialesValidos = materialesStroops !== null && materialesStroops >= 0n
    && (totalStroops === null || materialesStroops <= totalStroops);
  const descripcionValida = bytes > 0 && bytes <= MAX_DESCRIPTION_BYTES;
  const direccion = elegida.providerAddress;

  // Todo lo que se muestra sale del mismo cálculo que hará el contrato.
  const materialsBps = totalValido && materialesStroops !== null ? materialsBpsOf(totalStroops, materialesStroops) : 0;
  const adelanto = totalValido ? portion(totalStroops, materialsBps) : 0n;
  const saldo = totalValido ? totalStroops - adelanto : 0n;
  const comision = totalValido ? portion(totalStroops, FEE_BPS) : 0n;
  const topeAplicado = Boolean(totalValido && materialesStroops !== null && materialesStroops > adelanto);
  const exceso = topeAplicado && materialesStroops !== null ? materialesStroops - adelanto : 0n;

  const listo = totalValido && materialesValidos && descripcionValida && Boolean(direccion) && !enviando;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!listo || totalStroops === null || materialesStroops === null || !direccion) return;
    setEnviando(true);
    try {
      await sendQuote({
        solicitudId: solicitud.id,
        postulacionId: elegida.id,
        providerId: elegida.providerId,
        providerAddress: direccion,
        clienteId: solicitud.clienteId || clienteId,
        totalStroops: totalStroops.toString(),
        materialesStroops: materialesStroops.toString(),
        materialsBps,
        feeBps: FEE_BPS,
        reviewSecs: DEFAULT_REVIEW_SECS,
        descripcion: descripcion.trim(),
      });
      navigate('/profesional/solicitudes', { replace: true });
    } finally {
      setEnviando(false);
    }
  };

  return <Screen
    header={<ScreenHeader title="Cotización final" subtitle={solicitud.servicio} />}
    footer={<ScreenFooter className="border-t border-masi-gray bg-white">
      <Button type="submit" form="cotizacion" disabled={!listo}>
        {enviando ? 'Enviando…' : 'Enviar cotización'}<Send size={18} aria-hidden="true" />
      </Button>
      {!direccion && <p className="mt-2 text-center text-xs text-masi-muted">
        Termina de crear tu cuenta para enviar cotizaciones
      </p>}
    </ScreenFooter>}
  >
    <form id="cotizacion" onSubmit={submit} className="space-y-6 px-4 py-6">
      <Field
        label="Total del trabajo (S/)"
        inputMode="decimal"
        value={total}
        onChange={event => setTotal(event.target.value)}
        placeholder="Ej. 1200"
        required
      />
      <Field
        label="Materiales a comprar (S/)"
        inputMode="decimal"
        value={materiales}
        onChange={event => setMateriales(event.target.value)}
        placeholder="Ej. 360"
        hint={materialesValidos ? undefined : 'Los materiales no pueden pasar del total.'}
      />

      <div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-masi-navy">Descripción</span>
          <textarea
            value={descripcion}
            onChange={event => setDescripcion(event.target.value)}
            rows={4}
            className={cn(fieldBox, 'resize-none py-3')}
          />
        </label>
        <p className={cn('mt-1.5 text-right text-xs', bytes > MAX_DESCRIPTION_BYTES ? 'text-masi-error' : 'text-masi-muted')}>
          {bytes}/{MAX_DESCRIPTION_BYTES}
        </p>
      </div>

      {totalValido && <section className="rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <h2 className="text-sm font-semibold text-masi-navy">Cómo se reparte</h2>
        <ul className="mt-3 space-y-2 text-sm text-masi-text">
          <li>Al iniciar recibes <strong className="font-bold text-masi-navy">{formatSoles(adelanto)}</strong> para materiales.</li>
          <li>Al aprobar el cliente, recibes <strong className="font-bold text-masi-navy">{formatSoles(saldo)}</strong>.</li>
          <li className="flex items-start gap-2 border-t border-masi-gray pt-2 text-masi-muted">
            <Info size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
            Masi le cobra al cliente {formatSoles(comision)} de comisión. Tú recibes el total.
          </li>
        </ul>
      </section>}

      {topeAplicado && <p className="flex items-start gap-2 rounded-masi-card bg-masi-cream p-4 text-sm leading-relaxed text-masi-navy">
        <TriangleAlert size={17} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>
          El adelanto máximo es el 50 % ({formatSoles(adelanto)}). Los {formatSoles(exceso)} restantes
          los pones tú y los recuperas al aprobar.
        </span>
      </p>}
    </form>
  </Screen>;
}
