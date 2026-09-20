import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-masi-blue text-white hover:bg-masi-blue-hover disabled:bg-masi-gray disabled:text-masi-muted',
  accent: 'bg-masi-orange text-masi-navy hover:brightness-95 disabled:bg-masi-gray disabled:text-masi-muted',
  secondary: 'border-[1.5px] border-masi-blue bg-white text-masi-blue hover:bg-masi-blue-50 disabled:border-masi-gray disabled:text-masi-muted',
  ghost: 'text-masi-blue hover:bg-masi-blue-50 disabled:text-masi-muted',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = 'primary', className, type = 'button', children, ...rest }: Props) {
  return <button
    type={type}
    className={cn(
      'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-base font-semibold',
      'transition-[background-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.98]',
      'disabled:pointer-events-none',
      VARIANTS[variant],
      className,
    )}
    {...rest}
  >{children}</button>;
}
