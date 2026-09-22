import { handleApi } from '../server/api.js';
import { redisStore } from '../server/redisStore.js';

export function GET(req: Request): Promise<Response> {
  return handleApi(req, redisStore);
}

export function POST(req: Request): Promise<Response> {
  return handleApi(req, redisStore);
}

export function PATCH(req: Request): Promise<Response> {
  return handleApi(req, redisStore);
}

export function PUT(req: Request): Promise<Response> {
  return handleApi(req, redisStore);
}
