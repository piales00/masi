import { Activity, CircleUser, ClipboardList, House } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../cn';
import { useDemo } from '../demo/DemoContext';
import { alertasPara, cotizacionesPorEnviar, solicitudesPorAtender } from '../demo/selectors';
import { useJobsPorAtender } from '../escrow/useJobsPorAtender';

type BadgeKey = 'clientRequests' | 'providerAlerts' | 'providerQuotes';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Marca activo solo con coincidencia exacta, para rutas que son prefijo de otras. */
  end?: boolean;
  /** Contador derivado de los datos actuales; no hay estado leído/no leído. */
  badge?: BadgeKey;
}

/** Texto para lectores de pantalla: el número solo no dice de qué. */
const BADGE_LABEL: Record<BadgeKey, (count: number) => string> = {
  clientRequests: count => (count === 1 ? '1 solicitud necesita tu respuesta' : `${count} solicitudes necesitan tu respuesta`),
  providerAlerts: count => (count === 1 ? '1 solicitud disponible' : `${count} solicitudes disponibles`),
  providerQuotes: count => (count === 1 ? '1 asunto por atender' : `${count} asuntos por atender`),
};

export const CLIENT_NAV: readonly NavItem[] = [
  { to: '/home', label: 'Inicio', icon: House },
  { to: '/solicitudes', label: 'Solicitudes', icon: ClipboardList, badge: 'clientRequests' },
  { to: '/actividad', label: 'Actividad', icon: Activity },
  { to: '/perfil', label: 'Perfil', icon: CircleUser },
];

export const PROVIDER_NAV: readonly NavItem[] = [
  { to: '/profesional', label: 'Inicio', icon: House, end: true, badge: 'providerAlerts' },
  { to: '/profesional/solicitudes', label: 'Solicitudes', icon: ClipboardList, badge: 'providerQuotes' },
  { to: '/profesional/actividad', label: 'Actividad', icon: Activity },
  { to: '/profesional/perfil', label: 'Perfil', icon: CircleUser },
];

/**
 * Una sola navegación con dos presentaciones: cápsula flotante abajo en móvil y barra
 * lateral desde 768px. AppShell la coloca con flex-direction; aquí solo cambia la forma.
 *
 * En móvil no va pegada al borde: lleva margen a los lados y abajo (más el inset del
 * dispositivo, para no meterse bajo la barra de gestos), esquinas muy redondeadas y una
 * sombra tenue. Sigue en el flujo, no flotando por encima: así nunca tapa el final del
 * contenido ni el pie de una pantalla.
 */
export function MainNav({ items }: { items: readonly NavItem[] }) {
  const { clienteId, providerProfile, solicitudes, postulaciones, cotizaciones } = useDemo();
  const trabajos = useJobsPorAtender();

  const counts: Record<BadgeKey, number> = {
    clientRequests: solicitudesPorAtender(clienteId, solicitudes, postulaciones).length + trabajos.client,
    providerAlerts: alertasPara(providerProfile, solicitudes, postulaciones).length,
    providerQuotes: cotizacionesPorEnviar(providerProfile, solicitudes, postulaciones, cotizaciones).length + trabajos.provider,
  };

  return <nav
    aria-label="Secciones de Masi"
    className={cn(
      'order-last flex shrink-0 gap-1 rounded-full border border-masi-gray bg-white px-1.5 py-1.5 shadow-masi-md',
      'mx-3 mb-[calc(0.5rem+var(--masi-safe-bottom))]',
      'md:order-first md:mx-0 md:mb-0 md:w-56 md:flex-col md:rounded-none md:border-0 md:border-r md:px-3 md:py-4 md:shadow-none',
    )}
  >
    {items.map(({ to, label, icon: Icon, end, badge }) => {
      const count = badge ? counts[badge] : 0;
      const badgeLabel = badge && count > 0 ? BADGE_LABEL[badge](count) : null;
      return <NavLink
        key={to}
        to={to}
        end={end}
        className={({ isActive }) => cn(
          'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-2 text-[11px] leading-tight font-semibold',
          'transition-colors duration-200 ease-out md:flex-none md:flex-row md:justify-start md:gap-3 md:rounded-2xl md:px-3 md:py-2.5 md:text-sm',
          // Dentro de una cápsula, la marca del activo va dentro: un relleno suave, no
          // una barra pegada al borde, que ahora quedaría cortada por el redondeo.
          isActive ? 'bg-masi-blue-50 text-masi-blue md:bg-masi-blue-50' : 'text-masi-muted hover:text-masi-navy md:hover:bg-masi-bg',
        )}
      >
        <span className="relative">
          <Icon size={22} aria-hidden="true" className="md:size-5" />
          {badgeLabel && <span className="absolute -top-1.5 -right-2 grid min-w-4 place-items-center rounded-full bg-masi-blue px-1 text-[10px] font-bold text-white ring-2 ring-white">
            <span aria-hidden="true">{count}</span>
            <span className="sr-only">{badgeLabel}</span>
          </span>}
        </span>
        <span>{label}</span>
      </NavLink>;
    })}
  </nav>;
}
