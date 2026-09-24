import { useEffect, useState } from 'react';
import type { RatingSummary } from '../../shared/escrow';
import { ratingSource } from './dataSource';
import { parseRatingSummary } from './marketplace';

/** La lectura en bruto, con la dirección a la que pertenece. La comparten los dos hooks. */
function useLectura(addresses: readonly (string | null | undefined)[]): { clave: string; ratings: Map<string, RatingSummary>; listo: boolean } {
  // Clave estable: el array se crea de nuevo en cada render, la cadena no.
  const clave = [...new Set(addresses.filter((item): item is string => Boolean(item)))].sort().join(',');
  const [lectura, setLectura] = useState<{ clave: string; ratings: Map<string, RatingSummary> }>(
    { clave: '', ratings: new Map() },
  );

  useEffect(() => {
    const lista = clave ? clave.split(',') : [];
    if (lista.length === 0) {
      setLectura({ clave, ratings: new Map() });
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
      if (current) setLectura({ clave, ratings: new Map(pares.filter((par): par is [string, RatingSummary] => par !== null)) });
    });
    return () => { current = false; };
  }, [clave]);

  // La lectura lleva marcada la clave a la que pertenece: mientras no coincida con la
  // que se está pidiendo, lo que hay en memoria es de otra dirección o todavía no llegó.
  return { clave, ratings: lectura.clave === clave ? lectura.ratings : new Map(), listo: lectura.clave === clave };
}

/**
 * Calificación de profesionales que no están en el catálogo: la que guarda el contrato
 * para su dirección. Los del catálogo ya traen la suya con `useMarketplace`.
 *
 * Un profesional que se registra en la app no está en `providers.json`, así que sin esto
 * su reputación existe en la cadena pero no se ve en ninguna pantalla.
 */
export function useProviderRatings(addresses: readonly (string | null | undefined)[]): Map<string, RatingSummary> {
  return useLectura(addresses).ratings;
}

/**
 * Un solo profesional, con la señal de si su calificación ya se leyó.
 *
 * `listo` importa tanto como el dato: sin él, «todavía no ha llegado» y «no tiene
 * ninguna valoración» se ven igual —los dos como `null`— y la pantalla anuncia «Nuevo en
 * Masi» a alguien que sí tiene reputación, hasta que responde la cadena.
 */
export function useReputacionDe(address: string | null | undefined): { reputacion: RatingSummary | null; listo: boolean } {
  const { ratings, listo } = useLectura([address]);
  return { reputacion: ratings.get(address ?? '') ?? null, listo };
}

/** Misma fuente y misma tolerancia al fallo, para quien no necesita esperar. */
export function useProviderRating(address: string | null | undefined): RatingSummary | null {
  return useReputacionDe(address).reputacion;
}
