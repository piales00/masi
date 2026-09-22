import { mockEscrow } from './mockEscrow';
import { remoteDemoEscrow } from './remoteDemoEscrow';
import type { EscrowGateway } from './gateway';

/** Igual que dataSource.ts: el 22 solo cambia esta línea. */
export const escrow: EscrowGateway = import.meta.env.VITE_STORE === 'api' ? remoteDemoEscrow : mockEscrow;
export type { EscrowGateway } from './gateway';
