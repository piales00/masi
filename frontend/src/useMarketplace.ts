import { useCallback, useEffect, useState } from 'react';
import { ratingSource } from './dataSource';
import { loadMarketplace } from './marketplace';
import type { ProviderWithRating } from './marketplace';

export interface MarketplaceState {
  status: 'loading' | 'error' | 'ready';
  items: ProviderWithRating[];
  retry: () => void;
}

/** Carga los perfiles con su calificación. Lo usan Inicio y el listado completo. */
export function useMarketplace(): MarketplaceState {
  const [status, setStatus] = useState<MarketplaceState['status']>('loading');
  const [items, setItems] = useState<ProviderWithRating[]>([]);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    let current = true;
    setStatus('loading');
    loadMarketplace(ratingSource)
      .then(loaded => { if (current) { setItems(loaded); setStatus('ready'); } })
      .catch(() => { if (current) { setItems([]); setStatus('error'); } });
    return () => { current = false; };
  }, [attempt]);

  return { status, items, retry };
}

export const byDistance = (a: ProviderWithRating, b: ProviderWithRating): number => a.distance_km - b.distance_km;
