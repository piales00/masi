import { Outlet } from 'react-router-dom';

/**
 * Post-login content. Same single column as the phone, but allowed to grow on tablet
 * and desktop instead of staying locked at 448px. The bottom nav lives inside this
 * column at every size — no sidebar, by decision, to keep the MVP small.
 */
export function AppShell() {
  return <div className="flex h-dvh justify-center bg-masi-bg sm:bg-masi-blue-50 md:px-6 lg:px-8">
    <div className="flex h-full w-full max-w-md flex-col overflow-hidden bg-masi-bg sm:max-w-lg sm:border-x sm:border-masi-gray md:max-w-2xl lg:max-w-3xl">
      <Outlet />
    </div>
  </div>;
}
