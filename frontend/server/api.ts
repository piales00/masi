import { createHash, randomUUID } from 'node:crypto';
import {
  DEFAULT_REVIEW_SECS,
  FEE_BPS,
  MAX_MATERIALS_BPS,
  type ApiError,
  type Cotizacion,
  type CotizacionInput,
  type CotizacionPatch,
  type Postulacion,
  type PostulacionInput,
  type Resena,
  type ResenaInput,
  type Solicitud,
  type SolicitudEstado,
  type SolicitudInput,
} from '../../shared/api';
import { TRADES, type Trade } from '../src/marketplace';
import type { KeyValueStore } from './store';

const ADDRESS_RE = /^C[A-Z2-7]{55}$/;
const HEX_64_RE = /^[0-9a-f]{64}$/;
const UINT_RE = /^(0|[1-9][0-9]*)$/;
const SOLICITUD_ESTADOS: readonly SolicitudEstado[] = [
  'buscando_profesionales', 'profesional_elegido', 'cotizada', 'contratada',
];

function response(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

function error(status: number, code: ApiError['error']['code'], message: string): Response {
  return response({ error: { code, message } } satisfies ApiError, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await req.json();
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function nonEmpty(value: unknown, max = Number.POSITIVE_INFINITY): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

async function records<T>(store: KeyValueStore, prefix: string): Promise<T[]> {
  const values = await Promise.all((await store.list(prefix)).map(key => store.get(key)));
  return values.filter((value): value is T => value !== null).sort((left, right) => {
    const a = left as Record<string, unknown>;
    const b = right as Record<string, unknown>;
    return String(b.creadaEn ?? b.fecha ?? '').localeCompare(String(a.creadaEn ?? a.fecha ?? ''));
  });
}

function solicitudInput(value: Record<string, unknown>): SolicitudInput | null {
  const keys = ['clienteId', 'servicio', 'descripcion', 'fotos', 'ubicacion', 'distrito', 'cliente'] as const;
  if (!exactKeys(value, keys) || !nonEmpty(value.clienteId) ||
      typeof value.servicio !== 'string' || !TRADES.includes(value.servicio as Trade) ||
      !nonEmpty(value.descripcion) || typeof value.fotos !== 'number' ||
      !Number.isInteger(value.fotos) || value.fotos < 0 ||
      !nonEmpty(value.ubicacion) || !nonEmpty(value.distrito) || !nonEmpty(value.cliente)) return null;
  return value as unknown as SolicitudInput;
}

function postulacionInput(value: Record<string, unknown>): PostulacionInput | null {
  const keys = ['solicitudId', 'providerId', 'providerNombre', 'providerAddress', 'precio', 'minutos'] as const;
  if (!exactKeys(value, keys) || !nonEmpty(value.solicitudId) || !nonEmpty(value.providerId) ||
      !nonEmpty(value.providerNombre) ||
      !(value.providerAddress === null || (typeof value.providerAddress === 'string' && ADDRESS_RE.test(value.providerAddress))) ||
      typeof value.precio !== 'number' || !Number.isFinite(value.precio) || value.precio <= 0 ||
      typeof value.minutos !== 'number' || !Number.isInteger(value.minutos) || value.minutos < 0) return null;
  return value as unknown as PostulacionInput;
}

function calculateMaterialsBps(total: bigint, materials: bigint): number {
  const calculated = Number((materials * 10_000n) / total);
  return Math.min(calculated, MAX_MATERIALS_BPS);
}

function cotizacionInput(value: Record<string, unknown>): CotizacionInput | null {
  const keys = [
    'solicitudId', 'postulacionId', 'providerId', 'providerAddress', 'clienteId',
    'totalStroops', 'materialesStroops', 'materialsBps', 'feeBps', 'reviewSecs', 'descripcion',
  ] as const;
  if (!exactKeys(value, keys) || !nonEmpty(value.solicitudId) || !nonEmpty(value.postulacionId) ||
      !nonEmpty(value.providerId) || typeof value.providerAddress !== 'string' ||
      !ADDRESS_RE.test(value.providerAddress) || !nonEmpty(value.clienteId) ||
      typeof value.totalStroops !== 'string' || !UINT_RE.test(value.totalStroops) ||
      typeof value.materialesStroops !== 'string' || !UINT_RE.test(value.materialesStroops) ||
      typeof value.materialsBps !== 'number' || !Number.isInteger(value.materialsBps) ||
      value.feeBps !== FEE_BPS || typeof value.reviewSecs !== 'number' ||
      !Number.isInteger(value.reviewSecs) || value.reviewSecs <= 0 ||
      typeof value.descripcion !== 'string') return null;
  const total = BigInt(value.totalStroops);
  const materials = BigInt(value.materialesStroops);
  const bytes = new TextEncoder().encode(value.descripcion).length;
  if (total <= 0n || materials < 0n || bytes < 1 || bytes > 1_024 ||
      value.materialsBps !== calculateMaterialsBps(total, materials)) return null;
  return value as unknown as CotizacionInput;
}

function resenaInput(value: Record<string, unknown>): ResenaInput | null {
  const keys = ['providerId', 'providerAddress', 'estrellas', 'texto', 'hash'] as const;
  if (!exactKeys(value, keys) || !nonEmpty(value.providerId) ||
      typeof value.providerAddress !== 'string' || !ADDRESS_RE.test(value.providerAddress) ||
      typeof value.estrellas !== 'number' || !Number.isInteger(value.estrellas) ||
      value.estrellas < 1 || value.estrellas > 5 || typeof value.texto !== 'string' ||
      Array.from(value.texto).length < 1 || Array.from(value.texto).length > 500 ||
      typeof value.hash !== 'string' || !HEX_64_RE.test(value.hash)) return null;
  return value as unknown as ResenaInput;
}

export async function handleApi(req: Request, store: KeyValueStore): Promise<Response> {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
    const segments = path ? path.split('/').map(decodeURIComponent) : [];

    if (req.method === 'GET' && path === 'salud') return response({ ok: true });

    if (req.method === 'GET' && path === 'solicitudes') {
      const servicio = url.searchParams.get('servicio');
      const clienteId = url.searchParams.get('clienteId');
      const estado = url.searchParams.get('estado');
      const items = (await records<Solicitud>(store, 'solicitudes/')).filter(item =>
        (!servicio || item.servicio === servicio) && (!clienteId || item.clienteId === clienteId) &&
        (!estado || item.estado === estado));
      return response({ items });
    }

    if (req.method === 'POST' && path === 'solicitudes') {
      const body = await readBody(req);
      const input = body && solicitudInput(body);
      if (!input) return error(400, 'INVALID', 'Solicitud inválida.');
      const now = new Date().toISOString();
      const item: Solicitud = { ...input, id: randomUUID(), estado: 'buscando_profesionales', postulacionElegidaId: null, creadaEn: now, actualizadaEn: now };
      await store.set(`solicitudes/${item.id}`, item);
      return response(item, 201);
    }

    if (segments[0] === 'solicitudes' && segments.length === 2 && req.method === 'GET') {
      const item = await store.get(`solicitudes/${segments[1]}`);
      return item ? response(item) : error(404, 'NOT_FOUND', 'Solicitud no encontrada.');
    }

    if (segments[0] === 'solicitudes' && segments[2] === 'elegir' && segments.length === 3 && req.method === 'POST') {
      const item = await store.get(`solicitudes/${segments[1]}`) as Solicitud | null;
      if (!item) return error(404, 'NOT_FOUND', 'Solicitud no encontrada.');
      const body = await readBody(req);
      if (!body || !exactKeys(body, ['postulacionId']) || !nonEmpty(body.postulacionId)) return error(400, 'INVALID', 'Postulación inválida.');
      if (item.estado !== 'buscando_profesionales') return error(409, 'CONFLICT', 'La solicitud ya no admite elección.');
      const post = await store.get(`postulaciones/${item.id}/${body.postulacionId}`) as Postulacion | null;
      if (!post) return error(404, 'NOT_FOUND', 'Postulación no encontrada para esta solicitud.');
      const updated: Solicitud = { ...item, estado: 'profesional_elegido', postulacionElegidaId: post.id, actualizadaEn: new Date().toISOString() };
      await store.set(`solicitudes/${item.id}`, updated);
      return response(updated);
    }

    if (req.method === 'GET' && path === 'postulaciones') {
      const solicitudId = url.searchParams.get('solicitudId');
      const providerId = url.searchParams.get('providerId');
      const prefix = solicitudId ? `postulaciones/${solicitudId}/` : 'postulaciones/';
      const items = (await records<Postulacion>(store, prefix)).filter(item => !providerId || item.providerId === providerId);
      return response({ items });
    }

    if (req.method === 'POST' && path === 'postulaciones') {
      const body = await readBody(req);
      const input = body && postulacionInput(body);
      if (!input) return error(400, 'INVALID', 'Postulación inválida.');
      const solicitud = await store.get(`solicitudes/${input.solicitudId}`) as Solicitud | null;
      if (!solicitud) return error(404, 'NOT_FOUND', 'Solicitud no encontrada.');
      if (solicitud.estado !== 'buscando_profesionales') return error(409, 'CONFLICT', 'La solicitud ya no acepta postulaciones.');
      const duplicates = (await records<Postulacion>(store, `postulaciones/${input.solicitudId}/`)).some(item => item.providerId === input.providerId);
      if (duplicates) return error(409, 'CONFLICT', 'El profesional ya se postuló.');
      const item: Postulacion = { ...input, id: randomUUID(), fecha: new Date().toISOString() };
      await store.set(`postulaciones/${item.solicitudId}/${item.id}`, item);
      return response(item, 201);
    }

    if (req.method === 'GET' && path === 'cotizaciones') {
      const filters = ['solicitudId', 'providerId', 'clienteId'] as const;
      const items = (await records<Cotizacion>(store, 'cotizaciones/')).filter(item =>
        filters.every(key => !url.searchParams.get(key) || item[key] === url.searchParams.get(key)));
      return response({ items });
    }

    if (req.method === 'POST' && path === 'cotizaciones') {
      const body = await readBody(req);
      const input = body && cotizacionInput(body);
      if (!input) return error(400, 'INVALID', 'Cotización inválida.');
      const solicitud = await store.get(`solicitudes/${input.solicitudId}`) as Solicitud | null;
      if (!solicitud) return error(404, 'NOT_FOUND', 'Solicitud no encontrada.');
      const post = await store.get(`postulaciones/${input.solicitudId}/${input.postulacionId}`) as Postulacion | null;
      if (solicitud.estado !== 'profesional_elegido' || solicitud.postulacionElegidaId !== input.postulacionId ||
          !post || post.providerId !== input.providerId || solicitud.clienteId !== input.clienteId) {
        return error(409, 'CONFLICT', 'La solicitud no admite esta cotización.');
      }
      const existing = (await records<Cotizacion>(store, 'cotizaciones/')).some(item =>
        item.solicitudId === input.solicitudId && (item.estado === 'enviada' || item.estado === 'aceptada'));
      if (existing) return error(409, 'CONFLICT', 'Ya existe una cotización activa.');
      const now = new Date().toISOString();
      const item: Cotizacion = { ...input, id: randomUUID(), estado: 'enviada', jobId: null, txHash: null, creadaEn: now, actualizadaEn: now };
      await store.set(`cotizaciones/${item.id}`, item);
      await store.set(`solicitudes/${solicitud.id}`, { ...solicitud, estado: 'cotizada', actualizadaEn: now } satisfies Solicitud);
      return response(item, 201);
    }

    if (segments[0] === 'cotizaciones' && segments.length === 2 && req.method === 'PATCH') {
      const item = await store.get(`cotizaciones/${segments[1]}`) as Cotizacion | null;
      if (!item) return error(404, 'NOT_FOUND', 'Cotización no encontrada.');
      if (item.estado !== 'enviada') return error(409, 'CONFLICT', 'La cotización ya fue resuelta.');
      const body = await readBody(req);
      if (!body || (body.estado !== 'aceptada' && body.estado !== 'rechazada')) return error(400, 'INVALID', 'Cambio de cotización inválido.');
      const solicitud = await store.get(`solicitudes/${item.solicitudId}`) as Solicitud | null;
      if (!solicitud) return error(404, 'NOT_FOUND', 'Solicitud no encontrada.');
      const now = new Date().toISOString();
      let patch: CotizacionPatch;
      if (body.estado === 'aceptada') {
        if (!exactKeys(body, ['estado', 'jobId', 'txHash']) || typeof body.jobId !== 'string' ||
            !UINT_RE.test(body.jobId) || BigInt(body.jobId) <= 0n || typeof body.txHash !== 'string' || !HEX_64_RE.test(body.txHash)) {
          return error(400, 'INVALID', 'Aceptación inválida.');
        }
        patch = { estado: 'aceptada', jobId: body.jobId, txHash: body.txHash };
      } else {
        if (!exactKeys(body, ['estado'])) return error(400, 'INVALID', 'Rechazo inválido.');
        patch = { estado: 'rechazada' };
      }
      const updated: Cotizacion = { ...item, ...patch, jobId: patch.estado === 'aceptada' ? patch.jobId : null, txHash: patch.estado === 'aceptada' ? patch.txHash : null, actualizadaEn: now };
      await store.set(`cotizaciones/${item.id}`, updated);
      await store.set(`solicitudes/${solicitud.id}`, { ...solicitud, estado: patch.estado === 'aceptada' ? 'contratada' : 'profesional_elegido', actualizadaEn: now } satisfies Solicitud);
      return response(updated);
    }

    if (req.method === 'GET' && path === 'resenas') {
      const providerId = url.searchParams.get('providerId');
      const providerAddress = url.searchParams.get('providerAddress');
      const items = (await records<Resena>(store, 'resenas/')).filter(item =>
        (!providerId || item.providerId === providerId) && (!providerAddress || item.providerAddress === providerAddress));
      return response({ items });
    }

    if (segments[0] === 'resenas' && segments.length === 2 && req.method === 'GET') {
      const item = await store.get(`resenas/${segments[1]}`);
      return item ? response(item) : error(404, 'NOT_FOUND', 'Reseña no encontrada.');
    }

    if (segments[0] === 'resenas' && segments.length === 2 && req.method === 'PUT') {
      const jobId = segments[1];
      if (!UINT_RE.test(jobId) || BigInt(jobId) <= 0n) return error(400, 'INVALID', 'Trabajo inválido.');
      const body = await readBody(req);
      const input = body && resenaInput(body);
      if (!input) return error(400, 'INVALID', 'Reseña inválida.');
      const digest = createHash('sha256').update(input.texto, 'utf8').digest('hex');
      if (digest !== input.hash) return error(400, 'INVALID', 'El hash no corresponde al texto.');
      const existing = await store.get(`resenas/${jobId}`) as Resena | null;
      const item: Resena = { ...input, jobId, creadaEn: existing?.creadaEn ?? new Date().toISOString() };
      await store.set(`resenas/${jobId}`, item);
      return response(item);
    }

    if (url.searchParams.has('estado') && !SOLICITUD_ESTADOS.includes(url.searchParams.get('estado') as SolicitudEstado)) {
      return error(400, 'INVALID', 'Estado inválido.');
    }
    return error(404, 'NOT_FOUND', 'Ruta no encontrada.');
  } catch {
    return error(500, 'INTERNAL', 'Error interno.');
  }
}

export { DEFAULT_REVIEW_SECS };
