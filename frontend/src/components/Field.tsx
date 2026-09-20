import type { InputHTMLAttributes } from 'react';
import { cn } from '../cn';

export const fieldBox = 'w-full rounded-masi-input border border-masi-gray bg-white px-4 text-base text-masi-text placeholder:text-masi-muted focus:border-masi-blue focus:ring-4 focus:ring-masi-blue/15 focus:outline-none';

export function Field({ label, hint, className, ...rest }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block">
    <span className="mb-1.5 block text-sm font-semibold text-masi-navy">{label}</span>
    <input className={cn(fieldBox, 'h-12', className)} {...rest} />
    {hint && <span className="mt-1.5 block text-xs text-masi-muted">{hint}</span>}
  </label>;
}
