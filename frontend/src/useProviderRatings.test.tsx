import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

const rating_of = vi.fn();
vi.mock('./dataSource', () => ({ ratingSource: { rating_of: (address: string) => rating_of(address) } }));

const { useProviderRating, useProviderRatings } = await import('./useProviderRatings');

const DIRECCION = 'CC7TK7EBJT46ECHSE726ALGNVGNTHSHJA65BCGRCLS7E4UQ5TPYMMXKO';
const OTRA = 'CDSPVAOAQIYVQWS7JSTTXKRCZLJGSKMZJDCHRI6I2FIJA3NQMIJQL5PP';
const resumen = (stars_sum: number, rating_count: number, completed_jobs: number) =>
  ({ stars_sum, rating_count, completed_jobs, disputes: 0 });

afterEach(() => { cleanup(); rating_of.mockReset(); });

describe('useProviderRatings', () => {
  it('trae la calificación de un profesional que no está en el catálogo', async () => {
    rating_of.mockResolvedValue(resumen(4, 1, 1));
    const { result } = renderHook(() => useProviderRating(DIRECCION));

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toEqual(resumen(4, 1, 1));
    expect(rating_of).toHaveBeenCalledWith(DIRECCION);
  });

  it('devuelve null si la dirección falta, sin llamar al contrato', () => {
    const { result } = renderHook(() => useProviderRating(null));
    expect(result.current).toBeNull();
    expect(rating_of).not.toHaveBeenCalled();
  });

  it('no inventa un cero cuando la lectura falla', async () => {
    rating_of.mockRejectedValue(new Error('RPC caído'));
    const { result } = renderHook(() => useProviderRating(DIRECCION));

    await waitFor(() => expect(rating_of).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('rechaza un resumen incoherente en vez de mostrarlo', async () => {
    // Más estrellas que valoraciones posibles: el parser lo tumba.
    rating_of.mockResolvedValue(resumen(99, 1, 1));
    const { result } = renderHook(() => useProviderRating(DIRECCION));

    await waitFor(() => expect(rating_of).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('pide cada dirección una sola vez, aunque se repita', async () => {
    rating_of.mockResolvedValue(resumen(5, 1, 1));
    const { result } = renderHook(() => useProviderRatings([DIRECCION, DIRECCION, OTRA, null]));

    await waitFor(() => expect(result.current.size).toBe(2));
    expect(rating_of).toHaveBeenCalledTimes(2);
  });
});
