import { BellRing, Briefcase, CheckCircle2, MapPin, Star, TrendingUp } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Screen } from '../components/Screen';
import { cn } from '../cn';
import { mockDistanceKm } from '../demo/distance';
import { useDemo } from '../demo/DemoContext';
import { alertasPara } from '../demo/selectors';
import { formatPrice } from '../marketplace';
import { serviceOf } from '../trades';

/** Cifras de ejemplo: todavía no hay historial real del profesional. */
const STATS = { weekJobs: 3, earned: 940, rating: 4.8, totalJobs: 24 };

export function ProviderHomeScreen() {
  const { providerProfile, solicitudes, postulaciones, available, cargando, setAvailable } = useDemo();
  const navigate = useNavigate();
  const sent = (useLocation().state as { sent?: boolean } | null)?.sent === true;

  const services = providerProfile?.services ?? [];
  const alerts = alertasPara(providerProfile, solicitudes, postulaciones);

  return <Screen header={
    <header className="shrink-0 border-b border-masi-gray bg-white px-4 pt-[calc(0.75rem+var(--masi-safe-top))] pb-3">
      <h1 className="text-xl leading-tight font-bold text-masi-navy">Tu espacio profesional</h1>
    </header>
  }>
    <div className="px-4 py-6">
      {sent && <p className="mb-4 flex items-start gap-2 rounded-masi-input border border-masi-success bg-masi-green-50 p-3 text-sm text-masi-navy" role="status">
        <CheckCircle2 size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-masi-success" />
        Enviaste tu propuesta. El cliente la verá junto a las demás.
      </p>}

      <section className="rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <div className="flex items-center gap-3">
          {providerProfile?.photoUrl
            ? <img src={providerProfile.photoUrl} alt="" className="size-14 shrink-0 rounded-full border border-masi-gray object-cover" />
            : <Avatar name={providerProfile?.fullName ?? ''} />}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-masi-navy">{providerProfile?.fullName}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-masi-muted">
              <Star size={14} aria-hidden="true" className="text-masi-navy" />
              <strong className="font-bold text-masi-navy">{STATS.rating}</strong>
              <span>· {STATS.totalJobs} trabajos</span>
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-masi-gray pt-3">
          <span className="text-sm font-semibold text-masi-navy">{available ? 'Disponible' : 'No disponible'}</span>
          <button
            type="button"
            role="switch"
            aria-checked={available}
            aria-label="Disponible para recibir trabajos"
            onClick={() => setAvailable(!available)}
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-out',
              available ? 'bg-masi-success' : 'bg-masi-gray',
            )}
          >
            <span className={cn(
              'absolute top-1 size-5 rounded-full bg-white shadow-masi-sm transition-[left] duration-200 ease-out',
              available ? 'left-6' : 'left-1',
            )} />
          </button>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { icon: Briefcase, label: 'Esta semana', value: String(STATS.weekJobs) },
          { icon: TrendingUp, label: 'Ganado', value: formatPrice(STATS.earned) },
          { icon: Star, label: 'Calificación', value: String(STATS.rating) },
        ].map(({ icon: Icon, label, value }) => <div key={label} className="rounded-masi-card border border-masi-gray bg-white p-3 text-center shadow-masi-sm">
          <Icon size={18} aria-hidden="true" className="mx-auto text-masi-blue" />
          <p className="mt-2 text-base leading-tight font-bold text-masi-navy">{value}</p>
          <p className="mt-0.5 text-[11px] leading-tight text-masi-muted">{label}</p>
        </div>)}
      </div>

      <section className="mt-8" aria-labelledby="alertas">
        <h2 id="alertas" className="text-lg font-bold text-masi-navy">Nuevas alertas cerca de ti</h2>

        {alerts.length === 0
          ? <div className="mt-4 rounded-masi-card border border-dashed border-masi-gray bg-white px-6 py-10 text-center">
            <BellRing size={30} aria-hidden="true" className="mx-auto text-masi-blue" />
            {cargando
              ? <p className="mt-3 text-sm text-masi-muted">Buscando solicitudes…</p>
              : <>
                <p className="mt-3 text-sm text-masi-muted">
                  Todavía no hay solicitudes de {services.length > 0 ? services.join(' ni ') : 'tus servicios'}. Te avisaremos apenas llegue una.
                </p>
                {/* El filtro es por oficio, no por distrito: decirlo evita que parezca averiado. */}
                <p className="mt-2 text-xs text-masi-muted">Solo te llegan las de los servicios que ofreces.</p>
              </>}
          </div>
          : <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {alerts.map(alert => {
              const service = serviceOf(alert.servicio);
              const Icon = service.icon;
              return <li key={alert.id}>
                <button
                  onClick={() => navigate(`/profesional/alertas/${alert.id}`)}
                  className="w-full rounded-masi-card border border-masi-gray bg-white p-4 text-left shadow-masi-sm transition-colors duration-200 ease-out hover:border-masi-blue"
                >
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-masi-blue">
                    <Icon size={15} aria-hidden="true" />{alert.servicio}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-masi-text">{alert.descripcion}</p>
                  <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-masi-gray pt-3 text-xs text-masi-muted">
                    <span>{alert.cliente || 'Cliente de Masi'}</span>
                    <span className="flex items-center gap-1.5"><MapPin size={14} aria-hidden="true" />A {mockDistanceKm(alert.id)} km · {alert.distrito}</span>
                  </p>
                </button>
              </li>;
            })}
          </ul>}
      </section>
    </div>
  </Screen>;
}
