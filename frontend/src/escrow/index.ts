import { mockEscrow } from './mockEscrow';
import type { EscrowGateway } from './gateway';

/** Igual que dataSource.ts: el 22 solo cambia esta línea. */
export const escrow: EscrowGateway = mockEscrow;
export type { EscrowGateway } from './gateway';
