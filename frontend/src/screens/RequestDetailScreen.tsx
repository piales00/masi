import { CalendarClock, CheckCircle2, Clock3, ImageIcon, MapPin, Search, Star } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { cn } from '../cn';
import { useDemo } from '../demo/DemoContext';
import type { Postulacion } from '../demo/DemoContext';
import { formatPrice, formatRating } from '../marketplace';
import type { ProviderWithRating } from '../marketplace';
import { serviceOf } from '../trades';
import { useMarketplace } from '../useMarketplace';

/** Solo hay calificación si el profesional existe en el catálogo; si no, es nuevo. */
function ratingTexto(match: ProviderWithRating | undefined, ready: boolean): string | null {
  if (!ready) return null;
  return match ? formatRating(match.rating) : 'Nuevo en Masi';
}

export function RequestDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clienteId, solicitudes, postulaciones, chooseProposal } = useDemo();
  const { status, items } = useMarketplace();

  const solicitud = solicitudes.find(item => item.id === id && item.clienteId === clienteId);
  if (!solicitud) return <Navigate to="/solicitudes" replace />;

  const propuestas = postulaciones.filter(item => item.solicitudId === solicitud.id);
  const elegida = propuestas.find(item => item.id === solicitud.postulacionElegidaId);
  const service = serviceOf(solicitud.servicio);
  const Icon = service.icon;

  const elegir = (postulacion: Postulacion) => { void chooseProposal(solicitud.id, postulacion.id); };

  return <Screen header={<ScreenHeader title="Tu solicitud" subtitle={solicitud.servicio} />}>
    <div className="px-4 py-6">
      <section className="rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-masi-blue">
          <Icon size={15} aria-hidden="true" />{solicitud.servicio}
        </p>
        <p className="mt-3 text-base leading-relaxed text-masi-text">{solicitud.descripcion}</p>

        {solicitud.fotos > 0 && <ul className="mt-4 grid grid-cols-3 gap-2">
          {Array.from({ length: solicitud.fotos }, (_, index) => <li
            key={index}
            className="grid aspect-square place-items-center rounded-masi-input border border-masi-gray bg-masi-blue-50 text-masi-blue"
          ><ImageIcon size={22} aria-hidden="true" /><span className="sr-only">Foto {index + 1}</span></li>)}
        </ul>}

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

      {elegida && <p className="mt-4 flex items-start gap-2 rounded-masi-input border border-masi-success bg-masi-green-50 p-3 text-sm text-masi-navy" role="status">
        <CheckCircle2 size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-masi-success" />
        Elegiste a {elegida.providerNombre}.
      </p>}

      <section className="mt-8" aria-labelledby="propuestas">
        <h2 id="propuestas" className="text-lg font-bold text-masi-navy">Propuestas recibidas</h2>

        {propuestas.length === 0
          ? <div className="mt-4 rounded-masi-card border border-dashed border-masi-gray bg-white px-6 py-10 text-center">
            <Search size={30} aria-hidden="true" className="mx-auto text-masi-blue" />
            <p className="mt-3 text-sm font-semibold text-masi-navy">Buscando profesionales</p>
            <p className="mt-1 text-sm text-masi-muted">Todavía no recibiste propuestas. Aquí aparecerán apenas alguien postule.</p>
          </div>
          : <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {propuestas.map(propuesta => {
              const match = items.find(item => item.id === propuesta.providerId);
              const rating = ratingTexto(match, status === 'ready');
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
                  <Avatar name={propuesta.providerNombre} tint={service.tint} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-masi-navy">{propuesta.providerNombre}</h3>
                    {rating && <p className="mt-0.5 flex items-center gap-1.5 text-sm text-masi-muted">
                      {match && match.rating.rating_count > 0 && <Star size={14} aria-hidden="true" className="text-masi-navy" />}
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
                    <Button disabled={descartada} onClick={() => elegir(propuesta)}>Elegir a {propuesta.providerNombre}</Button>
                    <Button variant="secondary" onClick={() => navigate(`/solicitudes/${solicitud.id}/propuesta/${propuesta.id}`)}>
                      Ver perfil
                    </Button>
                  </div>}
              </li>;
            })}
          </ul>}
      </section>
    </div>
  </Screen>;
}
