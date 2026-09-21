import { useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../cn';

export const fieldBox = 'w-full rounded-masi-input border border-masi-gray bg-white px-4 text-base text-masi-text placeholder:text-masi-muted focus:border-masi-blue focus:ring-4 focus:ring-masi-blue/15 focus:outline-none';

export function Field({ label, hint, className, type, ...rest }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  return <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-masi-navy">{label}</label>
    <div className="relative">
      <input
        id={id}
        type={isPassword && visible ? 'text' : type}
        className={cn(fieldBox, 'h-12', isPassword && '!pr-12', className)}
        {...rest}
      />
      {isPassword && <button
        type="button"
        onClick={() => setVisible(current => !current)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-full text-masi-muted transition-colors duration-200 ease-out hover:bg-masi-bg hover:text-masi-navy"
      >{visible ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}</button>}
    </div>
    {hint && <span className="mt-1.5 block text-xs text-masi-muted">{hint}</span>}
  </div>;
}
