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

const FOTO = 'data:image/jpeg;base64,aaaa';
const OTRA = 'data:image/jpeg;base64,bbbb';

const iso = new Date().toISOString();

const solicitud = (fotos: number, id = 's1') => ({
  id, servicio: 'Pintura' as const, descripcion: 'Pintar', fotos,
  ubicacion: 'Av. 1', distrito: 'Chorrillos', cuando: 'Hoy', cliente: 'Samuel',
  clienteId: 'c1', estado: 'buscando_profesionales' as const, creadaEn: iso,
});

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
    await expect(store.crearSolicitud(solicitud(0), [])).resolves.toEqual(solicitud(0));
  });
});

describe('fotos en el almacén local', () => {
  it('guarda las imágenes al crear y las devuelve al abrir la solicitud', async () => {
    await store.crearSolicitud(solicitud(2), [FOTO, OTRA]);

    await expect(store.leerFotos('s1')).resolves.toEqual([FOTO, OTRA]);
  });

  it('no las mete en el registro de la solicitud, que se relee entero', async () => {
    const creada = await store.crearSolicitud(solicitud(1), [FOTO]);

    // En la solicitud solo viaja el recuento: las data URL van por su propio cajón.
    expect(creada.fotos).toBe(1);
    expect(JSON.stringify(creada)).not.toContain('data:image');
  });

  it('las fotos de una solicitud no se cuelan en otra', async () => {
    await store.crearSolicitud(solicitud(1), [FOTO]);
    await store.crearSolicitud({ ...solicitud(1), id: 's2' }, [OTRA]);

    await expect(store.leerFotos('s1')).resolves.toEqual([FOTO]);
    await expect(store.leerFotos('s2')).resolves.toEqual([OTRA]);
  });

  it('una solicitud sin fotos devuelve una lista vacía, no un error', async () => {
    await expect(store.leerFotos('sin-fotos')).resolves.toEqual([]);
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
