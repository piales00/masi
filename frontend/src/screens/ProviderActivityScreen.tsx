import { Activity, Clock3 } from 'lucide-react';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDemo } from '../demo/DemoContext';
import { formatPrice } from '../marketplace';
import { serviceOf } from '../trades';

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export function ProviderActivityScreen() {
  const { providerProfile, solicitudes, postulaciones } = useDemo();
  const mine = postulaciones.filter(item => item.providerId === providerProfile?.id);

  return <Screen header={<ScreenHeader title="Actividad" back={false} />}>
    <div className="px-4 py-6">
      {mine.length === 0
        ? <div className="rounded-masi-card border border-dashed border-masi-gray bg-white px-6 py-10 text-center">
          <Activity size={30} aria-hidden="true" className="mx-auto text-masi-blue" />
          <p className="mt-3 text-sm text-masi-muted">Aquí verás las propuestas que envíes y en qué quedaron.</p>
        </div>
        : <ul className="grid gap-3 lg:grid-cols-2">
          {mine.map(item => {
            const solicitud = solicitudes.find(row => row.id === item.solicitudId);
            const Icon = serviceOf(solicitud?.servicio ?? 'Más servicios').icon;
            return <li key={item.id} className="rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-masi-blue">
                  <Icon size={15} aria-hidden="true" />{solicitud?.servicio ?? 'Solicitud'}
                </p>
                <span className="shrink-0 rounded-full bg-masi-blue-50 px-3 py-1 text-xs font-semibold text-masi-navy">Enviada</span>
              </div>

              {solicitud && <p className="mt-2 line-clamp-2 text-sm text-masi-text">{solicitud.descripcion}</p>}

              <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-masi-gray pt-3 text-xs text-masi-muted">
                <div className="flex items-center gap-1.5">
                  <dt className="font-semibold text-masi-navy">Tu precio:</dt>
                  <dd>{formatPrice(item.precio)}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt><Clock3 size={14} aria-hidden="true" /><span className="sr-only">Llegada estimada</span></dt>
                  <dd>{item.minutos} min</dd>
                </div>
                <dd className="w-full">{formatDate(item.fecha)}</dd>
              </dl>
            </li>;
          })}
        </ul>}
    </div>
  </Screen>;
}
