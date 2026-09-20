import { Outlet } from 'react-router-dom';

/**
 * Onboarding and auth: a narrow centered column at every size. These screens are a
 * single column of form fields, so extra width would only stretch them.
 */
export function AuthLayout() {
  return <div className="flex h-dvh justify-center bg-masi-bg sm:bg-masi-blue-50">
    <div className="flex h-full w-full max-w-md flex-col overflow-hidden bg-masi-bg sm:border-x sm:border-masi-gray">
      <Outlet />
    </div>
  </div>;
}
