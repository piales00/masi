import { Outlet } from 'react-router-dom';
import { CLIENT_NAV, MainNav } from './MainNav';
import type { NavItem } from './MainNav';

/**
 * Post-login. Columna única en móvil con la navegación abajo; desde 768px la misma
 * navegación pasa a barra lateral y el contenido gana ancho. Sin sidebar aparte:
 * es un solo MainNav que cambia de forma. Cliente y profesional comparten el armazón
 * y solo cambian los ítems.
 */
export function AppShell({ items = CLIENT_NAV }: { items?: readonly NavItem[] }) {
  return <div className="flex h-dvh justify-center bg-masi-bg sm:bg-masi-blue-50 md:px-6 lg:px-8">
    <div className="flex h-full w-full max-w-md flex-col overflow-hidden bg-masi-bg sm:max-w-lg sm:border-x sm:border-masi-gray md:max-w-3xl md:flex-row lg:max-w-4xl">
      <MainNav items={items} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col"><Outlet /></div>
    </div>
  </div>;
}
