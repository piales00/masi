import { CalendarCheck, MapPin, MessageSquare, Star } from 'lucide-react';
import { Avatar } from './Avatar';
import { formatRating } from '../marketplace';
import type { ProviderWithRating } from '../marketplace';
import { serviceOf } from '../trades';

export function ProviderCard({ provider }: { provider: ProviderWithRating }) {
  const service = serviceOf(provider.trade);
  const TradeIcon = service.icon;
  const reviews = provider.rating.rating_count;

  return <article className="rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
    <div className="flex items-start gap-3">
      <Avatar name={provider.name} tint={service.tint} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-masi-navy">{provider.name}</h3>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-masi-blue">
          <TradeIcon size={15} aria-hidden="true" />{provider.trade}
        </p>
      </div>
      <p className="flex shrink-0 items-center gap-1 text-sm">
        {reviews > 0 && <Star size={15} aria-hidden="true" className="text-masi-navy" />}
        <strong className={reviews > 0 ? 'font-bold text-masi-navy' : 'text-xs font-semibold text-masi-muted'}>{formatRating(provider.rating)}</strong>
      </p>
    </div>

    <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-masi-gray pt-3 text-xs text-masi-muted">
      <div className="flex items-center gap-1.5">
        <dt><MapPin size={14} aria-hidden="true" /><span className="sr-only">Distancia</span></dt>
        <dd>A {provider.distance_km} km · {provider.district}</dd>
      </div>
      <div className="flex items-center gap-1.5">
        <dt><CalendarCheck size={14} aria-hidden="true" /><span className="sr-only">Disponibilidad</span></dt>
        <dd>{provider.availability}</dd>
      </div>
      {reviews > 0 && <div className="flex items-center gap-1.5">
        <dt><MessageSquare size={14} aria-hidden="true" /><span className="sr-only">Reseñas</span></dt>
        <dd>{reviews} {reviews === 1 ? 'reseña' : 'reseñas'}</dd>
      </div>}
    </dl>
  </article>;
}
