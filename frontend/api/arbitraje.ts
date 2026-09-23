import { handleArbitraje } from '../server/arbitraje.js';

function env() {
  return {
    ESCROW_CONTRACT_ID: process.env.ESCROW_CONTRACT_ID,
    ARBITER_SECRET: process.env.ARBITER_SECRET,
    ARBITER_PANEL_KEY: process.env.ARBITER_PANEL_KEY,
  };
}

export function POST(req: Request): Promise<Response> {
  return handleArbitraje(req, env());
}
