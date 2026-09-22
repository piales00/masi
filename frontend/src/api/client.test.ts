import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiCallError, api } from './client';

const ok = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => { vi.unstubAllGlobals(); });

/** Lo que realmente se envió: ruta, método y cuerpo ya parseado. */
function llamada(indice = 0) {
  const [url, init] = fetchSpy.mock.calls[indice] as [string, RequestInit | undefined];
  return { url, metodo: init?.method, cuerpo: init?.body ? JSON.parse(init.body as string) : undefined };
}

describe('rutas y cuerpos', () => {
  it('lista con los filtros como query', async () => {
    fetchSpy.mockImplementation(() => ok({ items: [] }));
    await api.listSolicitudes({ clienteId: 'c1' });
    expect(llamada().url).toBe('/api/solicitudes?clienteId=c1');

    await api.listPostulaciones({ solicitudId: 's1' });
    expect(llamada(1).url).toBe('/api/postulaciones?solicitudId=s1');

    await api.listCotizaciones({});
    expect(llamada(2).url).toBe('/api/cotizaciones');
  });

  it('elegir usa POST con el id de la postulación', async () => {
    fetchSpy.mockImplementation(() => ok({ id: 's1' }));
    await api.elegir('s1', 'p1');
    expect(llamada()).toMatchObject({
      url: '/api/solicitudes/s1/elegir',
      metodo: 'POST',
      cuerpo: { postulacionId: 'p1' },
    });
  });

  it('la reseña va por PUT con los cinco campos del contrato', async () => {
    fetchSpy.mockImplementation(() => ok({ jobId: '1' }));
    await api.putResena('1', {
      providerId: 'juan',
      providerAddress: 'CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526',
      estrellas: 5,
      texto: 'Muy bueno',
      hash: 'a'.repeat(64),
    });
    const { url, metodo, cuerpo } = llamada();
    expect(url).toBe('/api/resenas/1');
    expect(metodo).toBe('PUT');
    expect(Object.keys(cuerpo).sort()).toEqual(['estrellas', 'hash', 'providerAddress', 'providerId', 'texto']);
  });

  it('el dinero viaja como string, nunca como bigint', async () => {
    fetchSpy.mockImplementation(() => ok({ id: 'c1' }));
    await api.createCotizacion({
      solicitudId: 's1', postulacionId: 'p1', providerId: 'juan',
      providerAddress: 'CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526',
      clienteId: 'c1', totalStroops: '12000000000', materialesStroops: '3600000000',
      materialsBps: 3000, feeBps: 500, reviewSecs: 86400, descripcion: 'Pintar',
    });
    expect(typeof llamada().cuerpo.totalStroops).toBe('string');
  });
});

describe('errores', () => {
  it('traduce el error de la API y conserva su código', async () => {
    fetchSpy.mockImplementation(() => ok({ error: { code: 'CONFLICT', message: 'La solicitud ya no admite elección.' } }, 409));
    await expect(api.elegir('s1', 'p1')).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'La solicitud ya no admite elección.',
    });
  });

  it('una API caída da el mensaje genérico', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.listSolicitudes()).rejects.toThrow('Algo salió mal. Inténtalo de nuevo.');
    await expect(api.listSolicitudes()).rejects.toBeInstanceOf(ApiCallError);
  });

  it('una reseña que aún no existe no es un error', async () => {
    fetchSpy.mockImplementation(() => ok({ error: { code: 'NOT_FOUND', message: 'Reseña no encontrada.' } }, 404));
    await expect(api.getResena('1')).resolves.toBeNull();
  });

  it('un 500 sin cuerpo legible no rompe el cliente', async () => {
    fetchSpy.mockImplementation(() => Promise.resolve(new Response('no es json', { status: 500 })));
    await expect(api.listSolicitudes()).rejects.toThrow('Algo salió mal. Inténtalo de nuevo.');
  });

  it('un 200 que no es JSON tampoco: es la API mal enrutada, no una respuesta', async () => {
    // Sin backend, el dev server responde el index.html del SPA con estado 200.
    fetchSpy.mockImplementation(() => Promise.resolve(new Response('<!doctype html><html></html>', {
      status: 200, headers: { 'content-type': 'text/html' },
    })));
    await expect(api.listSolicitudes()).rejects.toBeInstanceOf(ApiCallError);
    await expect(api.listSolicitudes()).rejects.toThrow('Algo salió mal. Inténtalo de nuevo.');
  });
});
