import type { RatingSource, RatingSummary } from '../../shared/escrow';
import profileData from './data/providers.json';
import ratingData from './data/ratings.mock.json';

import { TRADES, type Trade } from '../../shared/trades.js';
export { TRADES, type Trade } from '../../shared/trades.js';
export interface Provider {
  id: string;
  address: string;
  name: string;
  trade: Trade;
  profession: string;
  district: string;
  /** Distancia al distrito del usuario, en kilómetros. Dato fuera de la cadena. */
  distance_km: number;
  availability: string;
  reference_price_pen: number;
  photo: string;
  specialty: string;
  description: string;
}

export interface ProviderWithRating extends Provider { rating: RatingSummary }
export type Filters = { trade: string; district: string };
export type SortOrder = 'featured' | 'rating' | 'price';

const ratingKeys = ['stars_sum', 'rating_count', 'completed_jobs', 'disputes'] as const;

/** Validate decoded RPC data at the boundary: Rust u32 maps exactly to JS number. */
export function parseRatingSummary(value: unknown): RatingSummary {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid rating summary');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== ratingKeys.length || ratingKeys.some(key => !Object.hasOwn(data, key))) throw new Error('Unexpected rating fields');
  for (const key of ratingKeys) {
    if (typeof data[key] !== 'number' || !Number.isInteger(data[key]) || data[key] < 0 || data[key] > 0xffffffff) throw new Error(`Invalid u32: ${key}`);
  }
  const summary = data as unknown as RatingSummary;
  if (summary.stars_sum < summary.rating_count || summary.stars_sum > summary.rating_count * 5 || summary.rating_count > summary.completed_jobs) throw new Error('Inconsistent rating summary');
  return { ...summary };
}

export function parseProviders(value: unknown): Provider[] {
  if (!Array.isArray(value)) throw new Error('Invalid provider list');
  const ids = new Set<string>();
  const addresses = new Set<string>();
  return value.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid provider');
    const row = raw as Record<string, unknown>;
    for (const key of ['id', 'address', 'name', 'trade', 'profession', 'district', 'availability', 'photo', 'specialty', 'description']) {
      if (typeof row[key] !== 'string' || !row[key].trim()) throw new Error(`Missing provider field: ${key}`);
    }
    if (!TRADES.includes(row.trade as Trade)) throw new Error('Unknown trade');
    if (typeof row.reference_price_pen !== 'number' || !Number.isFinite(row.reference_price_pen) || row.reference_price_pen <= 0) throw new Error('Invalid reference price');
    if (typeof row.distance_km !== 'number' || !Number.isFinite(row.distance_km) || row.distance_km <= 0) throw new Error('Invalid distance');
    if (!/^C[A-Z2-7]{55}$/.test(row.address as string)) throw new Error('Invalid contract address');
    if (ids.has(row.id as string) || addresses.has(row.address as string)) throw new Error('Duplicate provider');
    ids.add(row.id as string); addresses.add(row.address as string);
    return { ...row } as unknown as Provider;
  });
}

export const providers = parseProviders(profileData);
export const DISTRICTS = [...new Set(providers.map(provider => provider.district))].sort((a, b) => a.localeCompare(b, 'es'));

/** Same method and return shape as the future decoded contract reader. */
export const mockRatingSource: RatingSource = {
  async rating_of(address) {
    const summary = (ratingData as Record<string, unknown>)[address];
    // A missing mock is an error, never a fabricated zero rating.
    if (summary === undefined) throw new Error(`No fixture for ${address}`);
    return parseRatingSummary(summary);
  },
};

export async function loadMarketplace(source: RatingSource, profiles: readonly Provider[] = providers): Promise<ProviderWithRating[]> {
  return Promise.all(profiles.map(async provider => ({ ...provider, rating: parseRatingSummary(await source.rating_of(provider.address)) })));
}

export function averageRating(rating: RatingSummary): number | null {
  return rating.rating_count === 0 ? null : rating.stars_sum / rating.rating_count;
}

export function selectProviders(items: readonly ProviderWithRating[], filters: Filters, sort: SortOrder = 'featured'): ProviderWithRating[] {
  const selected = items.filter(item => (!filters.trade || item.trade === filters.trade) && (!filters.district || item.district === filters.district));
  if (sort === 'rating') selected.sort((a, b) => (averageRating(b.rating) ?? -1) - (averageRating(a.rating) ?? -1));
  if (sort === 'price') selected.sort((a, b) => a.reference_price_pen - b.reference_price_pen);
  return selected;
}

export const formatPrice = (amount: number): string => `S/ ${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(amount)}`;
export const formatRating = (rating: RatingSummary): string => {
  const average = averageRating(rating);
  return average === null ? 'Sin reseñas' : new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(average);
};
