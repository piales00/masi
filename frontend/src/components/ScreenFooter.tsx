import type { ReactNode } from 'react';
import { cn } from '../cn';

export function ScreenFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('shrink-0 px-4 pt-3 pb-[calc(0.75rem+var(--masi-safe-bottom))]', className)}>{children}</div>;
}
