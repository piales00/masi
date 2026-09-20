import { cn } from '../cn';
import type { Trade } from '../marketplace';
import { SERVICES, TINT_CLASSES } from '../trades';

/** Fila de servicios seleccionables, sobre el catálogo único. */
export function TradeChips({ selected, onSelect, label }: {
  selected: Trade | '';
  onSelect: (trade: Trade) => void;
  label: string;
}) {
  return <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
    {SERVICES.map(({ id, name, icon: Icon, tint }) => {
      const active = selected === id;
      return <button
        key={id}
        type="button"
        onClick={() => onSelect(id)}
        aria-pressed={active}
        className={cn(
          'flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-200 ease-out',
          active ? 'border-masi-blue bg-masi-blue text-white' : 'border-masi-gray bg-white text-masi-navy hover:border-masi-blue',
        )}
      >
        <span className={cn('grid size-6 place-items-center rounded-full', active ? 'bg-white/20 text-white' : TINT_CLASSES[tint])}>
          <Icon size={14} aria-hidden="true" />
        </span>
        {name}
      </button>;
    })}
  </div>;
}
