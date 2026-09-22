import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { handleApi } from './api';
import { MemoryStore } from './store';

const providerAddress = 'CDBZRR356DZUXA66KP4FBL77ZVFYGQ7LYM3KFW5Q2OV352CV3BXYF3XV';

function call(store: MemoryStore, method: string, path: string, body?: unknown) {
  return handleApi(new Request(`https://masiapp.vercel.app/api/${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), store);
}

const solicitud = {
  clienteId: 'cliente-local', servicio: 'Pintura', descripcion: 'Pintar sala', fotos: 2,
  ubicacion: 'Av. Demo 123', distrito: 'Surco', cliente: 'María',
};

const postulacion = (solicitudId: string) => ({
  solicitudId, providerId: 'juan', providerNombre: 'Juan', providerAddress,
  precio: 1200, minutos: 30,
});

const cotizacion = (solicitudId: string, postulacionId: string) => ({
  solicitudId, postulacionId, providerId: 'juan', providerAddress, clienteId: 'cliente-local',
  totalStroops: '12000000000', materialesStroops: '3600000000', materialsBps: 3000,
  feeBps: 500, reviewSecs: 86400, descripcion: 'Pintar departamento en Surco',
});

async function selected(store: MemoryStore) {
  const created = await (await call(store, 'POST', 'solicitudes', solicitud)).json();
  const post = await (await call(store, 'POST', 'postulaciones', postulacion(created.id))).json();
  await call(store, 'POST', `solicitudes/${created.id}/elegir`, { postulacionId: post.id });
  return { created, post };
}

describe('API del almacén', () => {
  test('flujo feliz completo y datos generados por el servidor', async () => {
    const store = new MemoryStore();
    expect(await (await call(store, 'GET', 'salud')).json()).toEqual({ ok: true });
    const { created, post } = await selected(store);
    expect(created).toMatchObject({ estado: 'buscando_profesionales', postulacionElegidaId: null });
    expect(created.id).toBeTruthy();
    expect(created.creadaEn).toBeTruthy();
    expect(post.fecha).toBeTruthy();

    const quoteResponse = await call(store, 'POST', 'cotizaciones', cotizacion(created.id, post.id));
    expect(quoteResponse.status).toBe(201);
    const quote = await quoteResponse.json();
    expect(quote).toMatchObject({ estado: 'enviada', jobId: null, txHash: null });

    const txHash = 'a'.repeat(64);
    const accepted = await call(store, 'PATCH', `cotizaciones/${quote.id}`, { estado: 'aceptada', jobId: '7', txHash });
    expect(await accepted.json()).toMatchObject({ estado: 'aceptada', jobId: '7', txHash });
    expect(await (await call(store, 'GET', `solicitudes/${created.id}`)).json()).toMatchObject({ estado: 'contratada' });

    const texto = 'Excelente trabajo';
    const hash = createHash('sha256').update(texto).digest('hex');
    const review = await call(store, 'PUT', 'resenas/7', { providerId: 'juan', providerAddress, estrellas: 5, texto, hash });
    expect(review.status).toBe(200);
    expect(await review.json()).toMatchObject({ jobId: '7', estrellas: 5, hash });
    expect(await (await call(store, 'GET', 'resenas?providerId=juan')).json()).toMatchObject({ items: [{ jobId: '7' }] });
  });

  test('rechaza campos que el servidor debe generar y dinero como number', async () => {
    const store = new MemoryStore();
    expect((await call(store, 'POST', 'solicitudes', { ...solicitud, id: 'inyectado' })).status).toBe(400);
    const { created, post } = await selected(store);
    expect((await call(store, 'POST', 'cotizaciones', {
      ...cotizacion(created.id, post.id), totalStroops: 12_000_000_000,
    })).status).toBe(400);
  });

  test('recalcula materialsBps y valida el hash SHA-256', async () => {
    const store = new MemoryStore();
    const { created, post } = await selected(store);
    expect((await call(store, 'POST', 'cotizaciones', {
      ...cotizacion(created.id, post.id), materialsBps: 2999,
    })).status).toBe(400);
    expect((await call(store, 'PUT', 'resenas/1', {
      providerId: 'juan', providerAddress, estrellas: 5, texto: 'Texto', hash: '0'.repeat(64),
    })).status).toBe(400);
  });

  test('aplica los conflictos de elección y postulaciones', async () => {
    const store = new MemoryStore();
    const created = await (await call(store, 'POST', 'solicitudes', solicitud)).json();
    const input = postulacion(created.id);
    const post = await (await call(store, 'POST', 'postulaciones', input)).json();
    expect((await call(store, 'POST', 'postulaciones', input)).status).toBe(409);
    expect((await call(store, 'POST', `solicitudes/${created.id}/elegir`, { postulacionId: post.id })).status).toBe(200);
    expect((await call(store, 'POST', `solicitudes/${created.id}/elegir`, { postulacionId: post.id })).status).toBe(409);
    expect((await call(store, 'POST', 'postulaciones', { ...input, providerId: 'ana' })).status).toBe(409);
  });

  test('aplica los conflictos de cotización y sus transiciones', async () => {
    const store = new MemoryStore();
    const { created, post } = await selected(store);
    const input = cotizacion(created.id, post.id);
    const quote = await (await call(store, 'POST', 'cotizaciones', input)).json();
    expect((await call(store, 'POST', 'cotizaciones', input)).status).toBe(409);
    expect((await call(store, 'PATCH', `cotizaciones/${quote.id}`, { estado: 'rechazada' })).status).toBe(200);
    expect((await call(store, 'PATCH', `cotizaciones/${quote.id}`, { estado: 'rechazada' })).status).toBe(409);
    const retry = await call(store, 'POST', 'cotizaciones', input);
    expect(retry.status).toBe(201);
  });
});
