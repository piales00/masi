import type { RatingSource } from '../../shared/escrow';
import { contractRatingSource } from './escrow/contractEscrow';
import { mockRatingSource } from './marketplace';

/** Con el escrow real, las estrellas salen de `rating_of` del contrato. */
export const ratingSource: RatingSource = import.meta.env.VITE_ESCROW === 'contract'
  ? contractRatingSource
  : mockRatingSource;
