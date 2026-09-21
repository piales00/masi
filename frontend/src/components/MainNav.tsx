import { Activity, CircleUser, ClipboardList, House } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../cn';
import { useDemo } from '../demo/DemoContext';
import { alertasPara, solicitudesPorAtender } from '../demo/selectors';

type BadgeKey = 'clientRequests' | 'providerAlerts';

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
  clientRequests: count => (count === 1 ? '1 solicitud con propuestas' : `${count} solicitudes con propuestas`),
  providerAlerts: count => (count === 1 ? '1 solicitud disponible' : `${count} solicitudes disponibles`),
};

export const CLIENT_NAV: readonly NavItem[] = [
  { to: '/home', label: 'Inicio', icon: House },
  { to: '/solicitudes', label: 'Solicitudes', icon: ClipboardList, badge: 'clientRequests' },
  { to: '/actividad', label: 'Actividad', icon: Activity },
  { to: '/perfil', label: 'Perfil', icon: CircleUser },
];

export const PROVIDER_NAV: readonly NavItem[] = [
  { to: '/profesional', label: 'Inicio', icon: House, end: true, badge: 'providerAlerts' },
  { to: '/profesional/actividad', label: 'Actividad', icon: Activity },
  { to: '/profesional/perfil', label: 'Perfil', icon: CircleUser },
];

/**
 * Una sola navegación con dos presentaciones: barra inferior en móvil y barra lateral
 * desde 768px. AppShell la coloca con flex-direction; aquí solo cambia la forma.
 */
export function MainNav({ items }: { items: readonly NavItem[] }) {
  const { clienteId, providerProfile, solicitudes, postulaciones } = useDemo();

  const counts: Record<BadgeKey, number> = {
    clientRequests: solicitudesPorAtender(clienteId, solicitudes, postulaciones).length,
    providerAlerts: alertasPara(providerProfile, solicitudes, postulaciones).length,
  };

  return <nav
    aria-label="Secciones de Masi"
    className={cn(
      'order-last flex shrink-0 border-t border-masi-gray bg-white px-2 pt-1.5 pb-[calc(0.375rem+var(--masi-safe-bottom))]',
      'md:order-first md:w-56 md:flex-col md:gap-1 md:border-t-0 md:border-r md:px-3 md:py-4',
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
          'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] leading-tight font-semibold',
          'transition-colors duration-200 ease-out md:flex-none md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 md:text-sm',
          isActive ? 'text-masi-blue md:bg-masi-blue-50' : 'text-masi-muted hover:text-masi-navy md:hover:bg-masi-bg',
        )}
      >
        {({ isActive }) => <>
          {isActive && <span aria-hidden="true" className="absolute top-0 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full bg-masi-orange md:hidden" />}
          <span className="relative">
            <Icon size={22} aria-hidden="true" className="md:size-5" />
            {badgeLabel && <span className="absolute -top-1.5 -right-2 grid min-w-4 place-items-center rounded-full bg-masi-blue px-1 text-[10px] font-bold text-white ring-2 ring-white">
              <span aria-hidden="true">{count}</span>
              <span className="sr-only">{badgeLabel}</span>
            </span>}
          </span>
          <span>{label}</span>
        </>}
      </NavLink>;
    })}
  </nav>;
}
