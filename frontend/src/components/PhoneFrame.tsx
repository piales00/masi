import { Outlet } from 'react-router-dom';

/**
 * Full screen on phones. From 640px up the same fluid app is shown inside a device
 * mockup — a development aid only, which also fakes the notch insets so the safe-area
 * padding of every screen is visible on a desktop browser.
 */
export function PhoneFrame() {
  return <div className="flex min-h-dvh justify-center sm:items-center sm:bg-linear-160 sm:from-masi-blue-50 sm:via-masi-bg sm:to-masi-cream sm:p-8">
    <div className="relative flex h-dvh w-full flex-col bg-masi-bg sm:h-auto sm:w-auto sm:rounded-[54px] sm:bg-masi-text sm:p-3 sm:shadow-masi-lg">
      <span aria-hidden="true" className="absolute top-28 -left-[3px] hidden h-7 w-[3px] rounded-l-full bg-masi-text sm:block" />
      <span aria-hidden="true" className="absolute top-40 -left-[3px] hidden h-12 w-[3px] rounded-l-full bg-masi-text sm:block" />
      <span aria-hidden="true" className="absolute top-56 -left-[3px] hidden h-12 w-[3px] rounded-l-full bg-masi-text sm:block" />
      <span aria-hidden="true" className="absolute top-44 -right-[3px] hidden h-20 w-[3px] rounded-r-full bg-masi-text sm:block" />

      <div className="relative flex h-full w-full flex-col overflow-hidden bg-masi-bg sm:h-[844px] sm:max-h-[calc(100dvh-5.5rem)] sm:w-[390px] sm:rounded-[42px] sm:[--masi-safe-bottom:20px] sm:[--masi-safe-top:28px]">
        <Outlet />
        <span aria-hidden="true" className="pointer-events-none absolute top-2 left-1/2 hidden h-7 w-24 -translate-x-1/2 rounded-full bg-masi-text sm:block" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-2 left-1/2 hidden h-1 w-32 -translate-x-1/2 rounded-full bg-masi-text/25 sm:block" />
      </div>
    </div>
  </div>;
}
