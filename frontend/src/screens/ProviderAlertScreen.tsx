import { useState } from 'react';
import type { FormEvent } from 'react';
import { Info, MapPin, Send } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { FotosDeSolicitud } from '../components/FotosDeSolicitud';
import { Screen } from '../components/Screen';
import { ScreenFooter } from '../components/ScreenFooter';
import { ScreenHeader } from '../components/ScreenHeader';
import { mockDistanceKm } from '../demo/distance';
import { useDemo } from '../demo/DemoContext';
import { formatPrice } from '../marketplace';
import { serviceOf } from '../trades';

/** Referencia informativa de ejemplo: no sale de datos reales de la zona. */
const AVERAGE_BY_SERVICE = 120;

export function ProviderAlertScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { providerProfile, solicitudes, sendProposal } = useDemo();
  const [precio, setPrecio] = useState('');
  const [minutos, setMinutos] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const solicitud = solicitudes.find(item => item.id === id);
  if (!solicitud) return <Navigate to="/profesional" replace />;

  const service = serviceOf(solicitud.servicio);
  const Icon = service.icon;
  const ready = Number(precio) > 0 && Number(minutos) > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || !providerProfile || enviando) return;
    setEnviando(true);
    setError('');
    try {
      await sendProposal({
        solicitudId: solicitud.id,
        providerId: providerProfile.id,
        precio: Number(precio),
        minutos: Number(minutos),
      });
      navigate('/profesional', { replace: true, state: { sent: true } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Algo salió mal. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return <Screen
    header={<ScreenHeader title="Detalle de la solicitud" subtitle={solicitud.servicio} />}
    footer={<ScreenFooter className="border-t border-masi-gray bg-white">
      <Button type="submit" form="propuesta" disabled={!ready || enviando}>
        {enviando ? 'Enviando…' : 'Enviar mi propuesta'}<Send size={18} aria-hidden="true" />
      </Button>
      {error && <p role="alert" className="mt-2 text-center text-sm text-masi-error">{error}</p>}
    </ScreenFooter>}
  >
    <div className="px-4 py-6">
      <section className="rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-masi-blue">
          <Icon size={15} aria-hidden="true" />{solicitud.servicio}
        </p>
        <p className="mt-3 text-base leading-relaxed text-masi-text">{solicitud.descripcion}</p>
        <dl className="mt-4 space-y-2 border-t border-masi-gray pt-3 text-sm text-masi-muted">
          <div className="flex gap-2"><dt className="font-semibold text-masi-navy">Cliente:</dt><dd>{solicitud.cliente || 'Cliente de Masi'}</dd></div>
          <div className="flex items-center gap-1.5">
            <dt><MapPin size={14} aria-hidden="true" /><span className="sr-only">Ubicación</span></dt>
            <dd>A {mockDistanceKm(solicitud.id)} km · {solicitud.distrito}{solicitud.ubicacion ? ` · ${solicitud.ubicacion}` : ''}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-masi-navy">Fotos del cliente</h2>
        {solicitud.fotos > 0
          ? <FotosDeSolicitud solicitudId={solicitud.id} cantidad={solicitud.fotos} etiqueta="del cliente" />
          : <p className="mt-2 text-sm text-masi-muted">El cliente no adjuntó fotos.</p>}
      </section>

      <form id="propuesta" onSubmit={event => { void submit(event); }} className="mt-8 space-y-4">
        <h2 className="text-sm font-semibold text-masi-navy">Tu propuesta</h2>
        <Field
          label="Precio (S/)"
          type="number"
          inputMode="numeric"
          min={1}
          value={precio}
          onChange={event => setPrecio(event.target.value)}
          placeholder="Ej. 150"
          required
        />
        <Field
          label="¿En cuántos minutos puedes llegar?"
          type="number"
          inputMode="numeric"
          min={1}
          value={minutos}
          onChange={event => setMinutos(event.target.value)}
          placeholder="Ej. 40"
          required
        />
        <p className="flex items-start gap-2 rounded-masi-input bg-masi-blue-50 p-3 text-xs leading-relaxed text-masi-navy">
          <Info size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>Referencia: en la zona este tipo de trabajo ronda los {formatPrice(AVERAGE_BY_SERVICE)}. El precio final lo defines tú después de revisar el problema.</span>
        </p>
      </form>
    </div>
  </Screen>;
}
