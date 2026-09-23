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
  clienteId: 'cliente-local', servicio: 'Pintura', descripcion: 'Pintar sala', fotos: [] as string[],
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

describe('ruta explícita: el enrutado de Vercel', () => {
  test('atiende rutas de varios niveles cuando la ruta llega por parámetro', async () => {
    const store = new MemoryStore();
    const creada = await handleApi(new Request('https://masiapp.vercel.app/api/index?ruta=solicitudes', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(solicitud),
    }), store, 'solicitudes');
    expect(creada.status).toBe(201);
    const { id } = await creada.json();

    const leida = await handleApi(
      new Request(`https://masiapp.vercel.app/api/index?ruta=solicitudes/${id}`), store, `solicitudes/${id}`);
    expect(leida.status).toBe(200);
    expect((await leida.json()).id).toBe(id);
  });

  test('sin ruta explícita sigue deduciéndola de la URL', async () => {
    const respuesta = await handleApi(new Request('https://masiapp.vercel.app/api/salud'), new MemoryStore());
    expect(await respuesta.json()).toEqual({ ok: true });
  });
});

describe('fotos de una solicitud', () => {
  /** Data URL válida de `longitud` caracteres en total. */
  const foto = (longitud = 1_000, tipo = 'jpeg') => {
    const prefijo = `data:image/${tipo};base64,`;
    return prefijo + 'A'.repeat(longitud - prefijo.length);
  };
  const conFotos = (fotos: unknown[]) => ({ ...solicitud, fotos });

  async function mensajeDeRechazo(fotos: unknown[]): Promise<string> {
    const respuesta = await call(new MemoryStore(), 'POST', 'solicitudes', conFotos(fotos));
    expect(respuesta.status).toBe(400);
    const body = await respuesta.json();
    expect(body.error.code).toBe('INVALID');
    return body.error.message;
  }

  test('guarda las fotos aparte y el registro solo lleva el recuento', async () => {
    const store = new MemoryStore();
    const fotos = [foto(1_000, 'jpeg'), foto(2_000, 'png')];
    const creada = await call(store, 'POST', 'solicitudes', conFotos(fotos));
    expect(creada.status).toBe(201);
    const { id, fotos: recuento } = await creada.json();
    expect(recuento).toBe(2);
    expect(await store.get(`solicitudes/${id}`)).toMatchObject({ fotos: 2 });

    const leidas = await call(store, 'GET', `solicitudes/${id}/fotos`);
    expect(leidas.status).toBe(200);
    expect(await leidas.json()).toEqual({ fotos });
  });

  test('el listado y el detalle no llevan ninguna imagen', async () => {
    const store = new MemoryStore();
    const { id } = await (await call(store, 'POST', 'solicitudes', conFotos([foto(150_000), foto(150_000)]))).json();
    const listado = await (await call(store, 'GET', 'solicitudes')).text();
    const detalle = await (await call(store, 'GET', `solicitudes/${id}`)).text();
    for (const texto of [listado, detalle]) {
      expect(texto).not.toContain('data:image');
      expect(texto.length).toBeLessThan(1_000);
    }
    expect(JSON.parse(listado).items).toHaveLength(1);
  });

  test('una solicitud sin fotos devuelve una lista vacía, no un 404', async () => {
    const store = new MemoryStore();
    const { id } = await (await call(store, 'POST', 'solicitudes', solicitud)).json();
    const respuesta = await call(store, 'GET', `solicitudes/${id}/fotos`);
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ fotos: [] });
  });

  test('una solicitud que no existe da 404', async () => {
    const respuesta = await call(new MemoryStore(), 'GET', 'solicitudes/no-existe/fotos');
    expect(respuesta.status).toBe(404);
    expect((await respuesta.json()).error.code).toBe('NOT_FOUND');
  });

  test('los cuatro rechazos dan 400 con mensajes distintos', async () => {
    const mensajes = await Promise.all([
      mensajeDeRechazo(Array.from({ length: 6 }, () => foto())),
      mensajeDeRechazo([foto(300_000)]),
      mensajeDeRechazo(['data:text/html,<script>alert(1)</script>']),
      mensajeDeRechazo(['data:image/svg+xml;base64,' + btoa('<svg onload="alert(1)"/>')]),
    ]);
    expect(new Set(mensajes).size).toBe(4);
    expect(mensajes[0]).toMatch(/como mucho 5/);
    expect(mensajes[1]).toMatch(/pesa más de 200 KB/);
    expect(mensajes[2]).toMatch(/JPEG, PNG ni WebP/);
    expect(mensajes[3]).toMatch(/SVG/);
  });

  test('rechaza base64 corrupto, entradas que no son texto y el total excedido', async () => {
    expect(await mensajeDeRechazo(['data:image/png;base64,AAAA"><script>'])).toMatch(/caracteres no válidos/);
    expect(await mensajeDeRechazo([42])).toMatch(/no es una imagen/);
    expect(await mensajeDeRechazo(Array.from({ length: 5 }, () => foto(170_000)))).toMatch(/Entre todas/);
  });

  test('el recuento no se puede mandar como número', async () => {
    expect((await call(new MemoryStore(), 'POST', 'solicitudes', { ...solicitud, fotos: 2 })).status).toBe(400);
  });

  test('una solicitud rechazada no deja fotos huérfanas', async () => {
    const store = new MemoryStore();
    await call(store, 'POST', 'solicitudes', conFotos([foto(), 'data:text/html,x']));
    expect(await store.list('')).toEqual([]);
  });
});
