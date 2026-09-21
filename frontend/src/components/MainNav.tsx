import { Activity, CircleUser, ClipboardList, House } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../cn';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Marca activo solo con coincidencia exacta, para rutas que son prefijo de otras. */
  end?: boolean;
}

export const CLIENT_NAV: readonly NavItem[] = [
  { to: '/home', label: 'Inicio', icon: House },
  { to: '/solicitudes', label: 'Solicitudes', icon: ClipboardList },
  { to: '/actividad', label: 'Actividad', icon: Activity },
  { to: '/perfil', label: 'Perfil', icon: CircleUser },
];

export const PROVIDER_NAV: readonly NavItem[] = [
  { to: '/profesional', label: 'Inicio', icon: House, end: true },
  { to: '/profesional/actividad', label: 'Actividad', icon: Activity },
  { to: '/profesional/perfil', label: 'Perfil', icon: CircleUser },
];

/**
 * Una sola navegación con dos presentaciones: barra inferior en móvil y barra lateral
 * desde 768px. AppShell la coloca con flex-direction; aquí solo cambia la forma.
 */
export function MainNav({ items }: { items: readonly NavItem[] }) {
  return <nav
    aria-label="Secciones de Masi"
    className={cn(
      'order-last flex shrink-0 border-t border-masi-gray bg-white px-2 pt-1.5 pb-[calc(0.375rem+var(--masi-safe-bottom))]',
      'md:order-first md:w-56 md:flex-col md:gap-1 md:border-t-0 md:border-r md:px-3 md:py-4',
    )}
  >
    {items.map(({ to, label, icon: Icon, end }) => <NavLink
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
        <Icon size={22} aria-hidden="true" className="md:size-5" />
        <span>{label}</span>
      </>}
    </NavLink>)}
  </nav>;
}
