import { beforeEach, describe, expect, it } from 'vitest';
import { MODO, store } from './store';
import type { ResenaInput } from '../../../shared/api';

const RESENA: ResenaInput = {
  providerId: 'juan',
  providerAddress: 'CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526',
  estrellas: 5,
  texto: 'Quedó impecable.',
  hash: 'b'.repeat(64),
};

beforeEach(() => { localStorage.clear(); });

describe('almacén por defecto', () => {
  it('sin VITE_STORE la demo sigue siendo local', () => {
    expect(MODO).toBe('local');
    expect(store.remoto).toBe(false);
  });

  it('no trae nada de fuera: cargar no toca el estado', async () => {
    await expect(store.cargar()).resolves.toBeNull();
  });

  it('devuelve tal cual lo que se le da, sin transformar', async () => {
    const solicitud = {
      id: 's1', servicio: 'Pintura' as const, descripcion: 'Pintar', fotos: ['data:image/jpeg;base64,xx'],
      ubicacion: 'Av. 1', distrito: 'Chorrillos', cuando: 'Hoy', cliente: 'Samuel',
      clienteId: 'c1', estado: 'buscando_profesionales' as const, creadaEn: new Date().toISOString(),
    };
    await expect(store.crearSolicitud(solicitud)).resolves.toEqual(solicitud);
  });
});

describe('reseñas en el almacén local', () => {
  it('guarda y vuelve a leer la reseña', async () => {
    await store.guardarResena('1', RESENA);

    const leida = await store.leerResena('1');
    expect(leida?.texto).toBe('Quedó impecable.');
    expect(leida?.estrellas).toBe(5);
    expect(leida?.jobId).toBe('1');
    expect(leida?.creadaEn).toBeTruthy();
  });

  it('sin reseña devuelve null, no un error', async () => {
    await expect(store.leerResena('999')).resolves.toBeNull();
  });

  it('no duplica al reescribir la del mismo trabajo', async () => {
    await store.guardarResena('1', RESENA);
    await store.guardarResena('1', { ...RESENA, estrellas: 4, texto: 'Corrijo mi nota.' });

    const guardadas = JSON.parse(localStorage.getItem('masi.demo.resenas.v1') ?? '[]') as unknown[];
    expect(guardadas).toHaveLength(1);
    expect((await store.leerResena('1'))?.estrellas).toBe(4);
  });

  it('las reseñas de trabajos distintos conviven', async () => {
    await store.guardarResena('1', RESENA);
    await store.guardarResena('2', { ...RESENA, estrellas: 3, texto: 'Correcto.' });

    expect((await store.leerResena('1'))?.estrellas).toBe(5);
    expect((await store.leerResena('2'))?.estrellas).toBe(3);
  });
});
