import type { ReactNode } from 'react';
import { cn } from '../cn';

/** Fixed header and footer, scroll only inside the content area — never the page. */
export function Screen({ header, footer, children, className }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return <div className="flex h-full min-h-0 flex-col">
    {header}
    <main className={cn('min-h-0 flex-1 overflow-y-auto overscroll-y-contain', className)}>{children}</main>
    {footer}
  </div>;
}
