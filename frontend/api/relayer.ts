import { handleRelayer, type RelayerEnv } from '../server/relayer';

function env(): RelayerEnv {
  return {
    RELAYER_API_KEY: process.env.RELAYER_API_KEY,
    RELAYER_BASE_URL: process.env.RELAYER_BASE_URL,
    ESCROW_CONTRACT_ID: process.env.ESCROW_CONTRACT_ID,
    PEN_SAC_ID: process.env.PEN_SAC_ID,
    WALLET_WASM_HASH: process.env.WALLET_WASM_HASH,
  };
}

export function POST(req: Request): Promise<Response> {
  return handleRelayer(req, env());
}
