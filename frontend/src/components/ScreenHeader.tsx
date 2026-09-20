import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export function ScreenHeader({ title, subtitle, back = true, right }: { title: string; subtitle?: string; back?: boolean; right?: ReactNode }) {
  const navigate = useNavigate();
  return <header className="shrink-0 border-b border-masi-gray bg-white px-4 pt-[calc(0.75rem+var(--masi-safe-top))] pb-3">
    <div className="flex items-center gap-3">
      {back && <button
        onClick={() => navigate(-1)}
        aria-label="Atrás"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-masi-bg text-masi-navy transition-colors duration-200 ease-out hover:bg-masi-blue-50"
      ><ArrowLeft size={21} aria-hidden="true" /></button>}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg leading-tight font-bold text-masi-navy">{title}</h1>
        {subtitle && <p className="truncate text-xs text-masi-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  </header>;
}
