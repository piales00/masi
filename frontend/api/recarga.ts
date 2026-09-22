import { handleRecarga } from '../server/recarga.js';

function env() {
  return { PEN_SAC_ID: process.env.PEN_SAC_ID, ISSUER_SECRET: process.env.ISSUER_SECRET };
}

export function GET(req: Request): Promise<Response> {
  return handleRecarga(req, env());
}

export function POST(req: Request): Promise<Response> {
  return handleRecarga(req, env());
}
