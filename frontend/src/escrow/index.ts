import { contractEscrow } from './contractEscrow';
import { mockEscrow } from './mockEscrow';
import { remoteDemoEscrow } from './remoteDemoEscrow';
import type { EscrowGateway } from './gateway';

/**
 * `VITE_ESCROW=contract` usa el escrow real en testnet: cada acción se firma con la
 * huella y la envía el relayer. Sin esa variable se mantiene la simulación, que sirve
 * para desarrollar sin cuentas ni red.
 */
export const escrow: EscrowGateway = import.meta.env.VITE_ESCROW === 'contract'
  ? contractEscrow
  : import.meta.env.VITE_STORE === 'api' ? remoteDemoEscrow : mockEscrow;
export type { EscrowGateway } from './gateway';
