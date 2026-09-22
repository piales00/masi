import { RefreshCw } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { useDemo } from '../demo/DemoContext';
import { CLIENT_NAV, MainNav } from './MainNav';
import type { NavItem } from './MainNav';

/**
 * Cuando el almacén compartido no responde, la app no se queda en blanco ni miente:
 * avisa y ofrece reintentar. Con el almacén local nunca aparece.
 */
function AvisoDeSincronizacion() {
  const { syncError, retrySync } = useDemo();
  if (!syncError) return null;
  return <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-masi-gray bg-masi-cream px-4 py-2 text-sm text-masi-navy">
    <span className="min-w-0 break-words">{syncError}</span>
    <button
      type="button"
      onClick={retrySync}
      className="flex shrink-0 items-center gap-1.5 font-semibold text-masi-blue underline-offset-4 hover:underline"
    ><RefreshCw size={14} aria-hidden="true" />Reintentar</button>
  </div>;
}

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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AvisoDeSincronizacion />
        <Outlet />
      </div>
    </div>
  </div>;
}
