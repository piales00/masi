import { describe, expect, it } from 'vitest';
import { averageRating, formatRating, parseRatingSummary, selectProviders } from './marketplace';
import type { ProviderWithRating } from './marketplace';
import type { RatingSummary } from '../../shared/escrow';

const resumen = (extra: Partial<RatingSummary> = {}): RatingSummary => ({
  stars_sum: 18,
  rating_count: 4,
  completed_jobs: 6,
  disputes: 0,
  ...extra,
});

const profesional = (
  id: string,
  extra: Partial<ProviderWithRating> = {},
): ProviderWithRating => ({
  id,
  address: `C${id.toUpperCase().padEnd(55, 'A')}`,
  name: id,
  trade: 'Pintura',
  profession: 'Pintor',
  district: 'Surco',
  distance_km: 2,
  availability: 'Hoy',
  reference_price_pen: 120,
  photo: 'x.jpg',
  specialty: 'Interiores',
  description: 'Pinta bien.',
  rating: resumen(),
  ...extra,
});

describe('parseRatingSummary', () => {
  it('acepta un resumen válido y devuelve una copia', () => {
    const entrada = resumen();
    const salida = parseRatingSummary({ ...entrada });

    expect(salida).toEqual(entrada);
    // No debe devolver el mismo objeto que le pasaron: los datos del RPC no se comparten.
    expect(salida).not.toBe(entrada);
  });

  it('acepta los extremos que la implementación permite', () => {
    expect(parseRatingSummary(resumen({ stars_sum: 0, rating_count: 0, completed_jobs: 0 })).rating_count).toBe(0);
    // stars_sum puede ir de rating_count (todo 1 estrella) a rating_count × 5.
    expect(parseRatingSummary(resumen({ stars_sum: 4, rating_count: 4 })).stars_sum).toBe(4);
    expect(parseRatingSummary(resumen({ stars_sum: 20, rating_count: 4 })).stars_sum).toBe(20);
  });

  it('rechaza lo que no es un objeto de datos', () => {
    expect(() => parseRatingSummary(null)).toThrow('Invalid rating summary');
    expect(() => parseRatingSummary([resumen()])).toThrow('Invalid rating summary');
    expect(() => parseRatingSummary('4 estrellas')).toThrow('Invalid rating summary');
  });

  it('rechaza campos de más o de menos', () => {
    const { disputes: _fuera, ...incompleto } = resumen();
    expect(() => parseRatingSummary(incompleto)).toThrow('Unexpected rating fields');
    expect(() => parseRatingSummary({ ...resumen(), extra: 1 })).toThrow('Unexpected rating fields');
  });

  it('rechaza lo que no es un u32', () => {
    expect(() => parseRatingSummary(resumen({ rating_count: 1.5 }))).toThrow('Invalid u32: rating_count');
    expect(() => parseRatingSummary(resumen({ disputes: -1 }))).toThrow('Invalid u32: disputes');
    expect(() => parseRatingSummary(resumen({ completed_jobs: 0x1_0000_0000 }))).toThrow('Invalid u32: completed_jobs');
    expect(() => parseRatingSummary({ ...resumen(), stars_sum: '18' })).toThrow('Invalid u32: stars_sum');
  });

  it('rechaza un resumen incoherente', () => {
    // Menos estrellas que reseñas, o más de cinco por reseña: imposible.
    expect(() => parseRatingSummary(resumen({ stars_sum: 3, rating_count: 4 }))).toThrow('Inconsistent rating summary');
    expect(() => parseRatingSummary(resumen({ stars_sum: 21, rating_count: 4 }))).toThrow('Inconsistent rating summary');
  });

  it('rechaza más reseñas que trabajos terminados', () => {
    // La regla que sostiene el argumento de confianza: solo califica quien pagó,
    // así que nunca puede haber más reseñas que trabajos completados.
    expect(() => parseRatingSummary(resumen({ stars_sum: 25, rating_count: 5, completed_jobs: 4 })))
      .toThrow('Inconsistent rating summary');
    // Con tantos trabajos como reseñas sí pasa: el límite es exacto, no estricto.
    expect(parseRatingSummary(resumen({ stars_sum: 25, rating_count: 5, completed_jobs: 5 })).rating_count).toBe(5);
  });
});

describe('selectProviders', () => {
  const catalogo: ProviderWithRating[] = [
    profesional('juan', { trade: 'Pintura', district: 'Surco', reference_price_pen: 120 }),
    profesional('rosa', { trade: 'Limpieza', district: 'Surco', reference_price_pen: 80 }),
    profesional('carlos', { trade: 'Pintura', district: 'Miraflores', reference_price_pen: 200 }),
  ];

  it('sin filtros devuelve todo, en el orden recibido', () => {
    expect(selectProviders(catalogo, { trade: '', district: '' }).map(item => item.id))
      .toEqual(['juan', 'rosa', 'carlos']);
  });

  it('filtra por oficio', () => {
    expect(selectProviders(catalogo, { trade: 'Pintura', district: '' }).map(item => item.id))
      .toEqual(['juan', 'carlos']);
  });

  it('filtra por distrito', () => {
    expect(selectProviders(catalogo, { trade: '', district: 'Surco' }).map(item => item.id))
      .toEqual(['juan', 'rosa']);
  });

  it('combina oficio y distrito', () => {
    expect(selectProviders(catalogo, { trade: 'Pintura', district: 'Surco' }).map(item => item.id))
      .toEqual(['juan']);
  });

  it('devuelve una lista vacía cuando nada coincide', () => {
    expect(selectProviders(catalogo, { trade: 'Pintura', district: 'Barranco' })).toEqual([]);
    expect(selectProviders([], { trade: '', district: '' })).toEqual([]);
  });

  it('ordena por precio de menor a mayor', () => {
    expect(selectProviders(catalogo, { trade: '', district: '' }, 'price').map(item => item.reference_price_pen))
      .toEqual([80, 120, 200]);
  });

  it('ordena por calificación de mayor a menor, y los sin reseñas quedan al final', () => {
    const conNotas: ProviderWithRating[] = [
      profesional('nuevo', { rating: resumen({ stars_sum: 0, rating_count: 0, completed_jobs: 0 }) }),
      profesional('bueno', { rating: resumen({ stars_sum: 10, rating_count: 2 }) }),
      profesional('mejor', { rating: resumen({ stars_sum: 8, rating_count: 2, completed_jobs: 4 }) }),
    ];
    expect(selectProviders(conNotas, { trade: '', district: '' }, 'rating').map(item => item.id))
      .toEqual(['bueno', 'mejor', 'nuevo']);
  });

  it('no altera la lista que recibe', () => {
    const original = [...catalogo];
    selectProviders(catalogo, { trade: '', district: '' }, 'price');
    expect(catalogo).toEqual(original);
  });
});

describe('formatRating', () => {
  it('muestra la media con un decimal', () => {
    expect(formatRating(resumen({ stars_sum: 18, rating_count: 4 }))).toBe('4.5');
    expect(formatRating(resumen({ stars_sum: 20, rating_count: 4 }))).toBe('5.0');
    expect(formatRating(resumen({ stars_sum: 14, rating_count: 3, completed_jobs: 3 }))).toBe('4.7');
  });

  it('sin reseñas no inventa una calificación', () => {
    const sinReseñas = resumen({ stars_sum: 0, rating_count: 0, completed_jobs: 3 });
    expect(averageRating(sinReseñas)).toBeNull();
    expect(formatRating(sinReseñas)).toBe('Sin reseñas');
    // Ni un cero, que se leería como una nota pésima.
    expect(formatRating(sinReseñas)).not.toContain('0');
  });
});
