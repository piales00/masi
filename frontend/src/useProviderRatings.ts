import { useEffect, useState } from 'react';
import type { RatingSummary } from '../../shared/escrow';
import { ratingSource } from './dataSource';
import { parseRatingSummary } from './marketplace';

/**
 * Calificación de profesionales que no están en el catálogo: la que guarda el contrato
 * para su dirección. Los del catálogo ya traen la suya con `useMarketplace`.
 *
 * Un profesional que se registra en la app no está en `providers.json`, así que sin esto
 * su reputación existe en la cadena pero no se ve en ninguna pantalla.
 */
export function useProviderRatings(addresses: readonly (string | null | undefined)[]): Map<string, RatingSummary> {
  // Clave estable: el array se crea de nuevo en cada render, la cadena no.
  const clave = [...new Set(addresses.filter((item): item is string => Boolean(item)))].sort().join(',');
  const [ratings, setRatings] = useState<Map<string, RatingSummary>>(new Map());

  useEffect(() => {
    const lista = clave ? clave.split(',') : [];
    if (lista.length === 0) {
      setRatings(new Map());
      return;
    }
    let current = true;
    void Promise.all(lista.map(async address => {
      try {
        return [address, parseRatingSummary(await ratingSource.rating_of(address))] as const;
      } catch {
        // Sin calificación legible se muestra "Nuevo en Masi". Nunca se inventa un cero.
        return null;
      }
    })).then(pares => {
      if (current) setRatings(new Map(pares.filter((par): par is [string, RatingSummary] => par !== null)));
    });
    return () => { current = false; };
  }, [clave]);

  return ratings;
}

/** Un solo profesional. Misma fuente, misma tolerancia al fallo. */
export function useProviderRating(address: string | null | undefined): RatingSummary | null {
  return useProviderRatings([address]).get(address ?? '') ?? null;
}
