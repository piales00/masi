import { cn } from '../cn';
import { TINT_CLASSES } from '../trades';
import type { TradeTint } from '../trades';

const SIZES = {
  sm: 'size-10 text-sm',
  md: 'size-12 text-base',
  lg: 'size-16 text-xl',
} as const;

const initialsOf = (name: string): string => name.trim().split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase();

/**
 * Iniciales sobre un tinte de la paleta. Todavía no hay fotos en el repo, así que no
 * intentamos cargar ninguna: nunca se ve una imagen rota ni su texto alternativo.
 */
export function Avatar({ name, tint = 'blue', size = 'md', className }: { name: string; tint?: TradeTint; size?: keyof typeof SIZES; className?: string }) {
  return <span
    aria-hidden="true"
    className={cn('grid shrink-0 place-items-center rounded-full font-bold', SIZES[size], TINT_CLASSES[tint], className)}
  >{initialsOf(name)}</span>;
}
