import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Solicitud as SolicitudRemota } from '../../../shared/api';

/**
 * El caso de los dos teléfonos: con `VITE_STORE=api` las imágenes tienen que salir de este
 * navegador y llegar al almacén compartido, porque es lo único que el otro puede leer.
 */
vi.stubEnv('VITE_STORE', 'api');

const createSolicitud = vi.fn();
const getFotos = vi.fn();
vi.mock('../api/client', () => ({
  api: {
    createSolicitud: (input: unknown) => createSolicitud(input),
    getFotos: (id: string) => getFotos(id),
  },
}));

const { MODO, store } = await import('./store');

const UNA = 'data:image/jpeg;base64,aaaa';
const OTRA = 'data:image/jpeg;base64,bbbb';
const iso = new Date().toISOString();

const local = {
  id: 'nuevo', servicio: 'Pintura' as const, descripcion: 'Pintar', fotos: 2,
  ubicacion: 'Av. 1', distrito: 'Chorrillos', cuando: 'Hoy', cliente: 'Samuel',
  clienteId: 'c1', estado: 'buscando_profesionales' as const, creadaEn: iso,
};

const remota: SolicitudRemota = {
  id: 's-api', clienteId: 'c1', servicio: 'Pintura', descripcion: 'Pintar', fotos: 2,
  ubicacion: 'Av. 1', distrito: 'Chorrillos', cliente: 'Samuel',
  estado: 'buscando_profesionales', postulacionElegidaId: null, creadaEn: iso, actualizadaEn: iso,
};

beforeEach(() => {
  localStorage.clear();
  createSolicitud.mockReset().mockResolvedValue(remota);
  getFotos.mockReset().mockResolvedValue([UNA, OTRA]);
});

describe('fotos en el almacén compartido', () => {
  it('el almacén activo es el remoto', () => {
    expect(MODO).toBe('api');
    expect(store.remoto).toBe(true);
  });

  it('manda las imágenes al crear la solicitud', async () => {
    await store.crearSolicitud(local, [UNA, OTRA]);

    expect(createSolicitud).toHaveBeenCalledWith(expect.objectContaining({
      descripcion: 'Pintar', fotos: [UNA, OTRA],
    }));
  });

  it('ya no deja copias en este navegador: el otro teléfono no las vería', async () => {
    await store.crearSolicitud(local, [UNA, OTRA]);

    const guardado = JSON.stringify(localStorage);
    expect(guardado).not.toContain('data:image');
    // La urgencia sí se queda: el contrato compartido no tiene dónde ponerla.
    expect(guardado).toContain('Hoy');
  });

  it('el recuento de la solicitud lo dice el servidor, no el formulario', async () => {
    createSolicitud.mockResolvedValue({ ...remota, fotos: 2 });

    const creada = await store.crearSolicitud({ ...local, fotos: 99 }, [UNA, OTRA]);

    expect(creada.fotos).toBe(2);
  });

  it('las pide por su endpoint al abrir la solicitud', async () => {
    await expect(store.leerFotos('s-api')).resolves.toEqual([UNA, OTRA]);
    expect(getFotos).toHaveBeenCalledWith('s-api');
  });

  it('un fallo del endpoint llega a quien lo llamó, que decide qué mostrar', async () => {
    getFotos.mockRejectedValue(new Error('Algo salió mal. Inténtalo de nuevo.'));

    await expect(store.leerFotos('s-api')).rejects.toThrow('Algo salió mal.');
  });
});
