import { CircleAlert, Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { ProviderCard } from '../components/ProviderCard';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { TRADES, selectProviders } from '../marketplace';
import type { Trade } from '../marketplace';
import { byDistance, useMarketplace } from '../useMarketplace';

export function ProvidersScreen() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('servicio') ?? '';
  const trade: Trade | '' = TRADES.includes(requested as Trade) ? requested as Trade : '';
  const { status, items, retry } = useMarketplace();

  const list = selectProviders(items, { trade, district: '' }).sort(byDistance);

  return <Screen header={<ScreenHeader
    title={trade ? 'Para tu solicitud' : 'Profesionales cerca de ti'}
    subtitle={trade ? `${trade} · más cercanos primero` : 'Más cercanos primero'}
  />}>
    <div className="px-4 py-6">
      {trade && <button
        onClick={() => setParams({}, { replace: true })}
        className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-masi-gray bg-white px-4 text-sm font-semibold text-masi-navy transition-colors duration-200 ease-out hover:border-masi-blue"
      >{trade}<X size={15} aria-hidden="true" /></button>}

      <p className="text-xs text-masi-muted" role="status" aria-live="polite">
        {status === 'ready' ? `${list.length} ${list.length === 1 ? 'profesional disponible' : 'profesionales disponibles'}` : ''}
      </p>

      {status === 'loading' && <div className="mt-4 grid gap-3 lg:grid-cols-2" aria-busy="true" aria-label="Cargando profesionales">
        {[0, 1, 2, 3].map(key => <div key={key} className="h-[132px] animate-pulse rounded-masi-card border border-masi-gray bg-masi-gray/40" />)}
      </div>}

      {status === 'error' && <div className="mt-4 rounded-masi-card border border-dashed border-masi-gray bg-white px-6 py-10 text-center" role="alert">
        <CircleAlert size={32} aria-hidden="true" className="mx-auto text-masi-blue" />
        <p className="mt-3 text-sm text-masi-muted">Algo salió mal. Inténtalo de nuevo.</p>
        <Button className="mt-5" onClick={retry}>Volver a intentar</Button>
      </div>}

      {status === 'ready' && (list.length > 0
        ? <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {list.map(provider => <ProviderCard key={provider.id} provider={provider} />)}
        </div>
        : <div className="mt-4 rounded-masi-card border border-dashed border-masi-gray bg-white px-6 py-10 text-center">
          <Search size={32} aria-hidden="true" className="mx-auto text-masi-blue" />
          <p className="mt-3 text-sm text-masi-muted">Todavía no hay profesionales de este servicio en tu zona.</p>
          <Button variant="secondary" className="mt-5" onClick={() => setParams({}, { replace: true })}>Ver todos</Button>
        </div>)}
    </div>
  </Screen>;
}
