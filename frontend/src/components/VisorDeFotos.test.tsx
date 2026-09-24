import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoProvider } from '../demo/DemoContext';
import { store } from '../demo/store';
import { ProviderAlertScreen } from '../screens/ProviderAlertScreen';

/**
 * El visor se abre desde las miniaturas de `FotosDeSolicitud`, así que se prueba por
 * donde se usa de verdad: la solicitud abierta por el profesional. Las imágenes son las
 * que la pantalla ya cargó; el visor no pide nada.
 */
const CLIENTE = 'cliente-1';
const UNA = 'data:image/jpeg;base64,aaaa';
const DOS = 'data:image/jpeg;base64,bbbb';
const TRES = 'data:image/jpeg;base64,cccc';
const iso = new Date().toISOString();

function sembrar(cuantas: number) {
  localStorage.setItem('masi.demo.clienteId.v1', JSON.stringify(CLIENTE));
  localStorage.setItem('masi.demo.profesional.v2', JSON.stringify({
    id: 'juan', fullName: 'Juan Ramírez', services: ['Pintura'], district: 'Surco', yearsExperience: 8, bio: '',
  }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: false, provider: true }));
  localStorage.setItem('masi.demo.solicitudes.v1', JSON.stringify([{
    id: 's1', servicio: 'Pintura', descripcion: 'Pintar la sala', fotos: cuantas, ubicacion: 'Av. 1',
    distrito: 'Chorrillos', cuando: 'Hoy', cliente: 'Samuel Ortega', clienteId: CLIENTE,
    estado: 'buscando_profesionales', creadaEn: iso,
  }]));
}

const montar = () => render(<DemoProvider>
  <MemoryRouter initialEntries={['/profesional/alertas/s1']}>
    <Routes><Route path="/profesional/alertas/:id" element={<ProviderAlertScreen />} /></Routes>
  </MemoryRouter>
</DemoProvider>);

/** Abre el visor tocando la miniatura indicada, ya con las fotos cargadas. */
async function abrir(cual: number) {
  await userEvent.click(await screen.findByRole('button', { name: `Ver foto ${cual} del cliente` }));
}

const visor = () => screen.queryByRole('dialog');
const contador = () => screen.getByRole('dialog').querySelector('p.tabular-nums')?.textContent;
const ampliada = () => screen.getByRole('dialog').querySelector('img')?.getAttribute('src');
const marco = () => screen.getByRole('dialog').querySelector('img')!.parentElement!;

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('visor de fotos', () => {
  it('tocar una miniatura lo abre, y la X lo cierra', async () => {
    sembrar(1);
    vi.spyOn(store, 'leerFotos').mockResolvedValue([UNA]);
    montar();

    expect(visor()).toBeNull();
    await abrir(1);

    expect(visor()).toBeTruthy();
    expect(ampliada()).toBe(UNA);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar visor' }));
    expect(visor()).toBeNull();
  });

  it('con una sola foto dice 1 / 1 y no ofrece navegación', async () => {
    sembrar(1);
    vi.spyOn(store, 'leerFotos').mockResolvedValue([UNA]);
    montar();
    await abrir(1);

    expect(contador()).toBe('1 / 1');
    expect(screen.queryByRole('button', { name: 'Foto siguiente' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Foto anterior' })).toBeNull();
  });

  it('con varias, avanza y retrocede sin salirse del rango', async () => {
    sembrar(3);
    vi.spyOn(store, 'leerFotos').mockResolvedValue([UNA, DOS, TRES]);
    montar();
    await abrir(1);

    expect(contador()).toBe('1 / 3');
    // En la primera no hay anterior al que ir.
    expect(screen.getByRole('button', { name: 'Foto anterior' }).hasAttribute('disabled')).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Foto siguiente' }));
    expect(contador()).toBe('2 / 3');
    expect(ampliada()).toBe(DOS);

    await userEvent.click(screen.getByRole('button', { name: 'Foto anterior' }));
    expect(contador()).toBe('1 / 3');
    expect(ampliada()).toBe(UNA);

    await userEvent.click(screen.getByRole('button', { name: 'Foto siguiente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Foto siguiente' }));
    expect(contador()).toBe('3 / 3');
    expect(screen.getByRole('button', { name: 'Foto siguiente' }).hasAttribute('disabled')).toBe(true);
  });

  it('abre por la miniatura que se tocó, no siempre por la primera', async () => {
    sembrar(3);
    vi.spyOn(store, 'leerFotos').mockResolvedValue([UNA, DOS, TRES]);
    montar();
    await abrir(3);

    expect(contador()).toBe('3 / 3');
    expect(ampliada()).toBe(TRES);
  });

  it('deslizar pasa de foto; un roce no', async () => {
    sembrar(3);
    vi.spyOn(store, 'leerFotos').mockResolvedValue([UNA, DOS, TRES]);
    montar();
    await abrir(1);

    const deslizar = (desde: number, hasta: number) => {
      fireEvent.touchStart(marco(), { touches: [{ clientX: desde }] });
      fireEvent.touchEnd(marco(), { changedTouches: [{ clientX: hasta }] });
    };

    deslizar(300, 100);
    expect(contador()).toBe('2 / 3');

    deslizar(100, 300);
    expect(contador()).toBe('1 / 3');

    // Diez píxeles son un temblor de dedo, no un gesto.
    deslizar(200, 190);
    expect(contador()).toBe('1 / 3');
  });

  it('el teclado mueve y Escape cierra', async () => {
    sembrar(3);
    vi.spyOn(store, 'leerFotos').mockResolvedValue([UNA, DOS, TRES]);
    montar();
    await abrir(1);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(contador()).toBe('2 / 3');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(contador()).toBe('1 / 3');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(contador()).toBe('1 / 3');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(visor()).toBeNull();
  });

  it('usa las fotos ya cargadas: abrirlo no pide nada más', async () => {
    sembrar(2);
    const espia = vi.spyOn(store, 'leerFotos').mockResolvedValue([UNA, DOS]);
    montar();
    await abrir(1);
    await userEvent.click(screen.getByRole('button', { name: 'Foto siguiente' }));

    // Una sola lectura: la de la pantalla al abrir la solicitud.
    expect(espia).toHaveBeenCalledTimes(1);
    expect(ampliada()).toBe(DOS);
  });

  it('sin fotos no hay miniatura que tocar ni visor', async () => {
    sembrar(0);
    const espia = vi.spyOn(store, 'leerFotos');
    montar();

    expect(await screen.findByText('El cliente no adjuntó fotos.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ver foto/ })).toBeNull();
    expect(visor()).toBeNull();
    expect(espia).not.toHaveBeenCalled();
  });

  it('las miniaturas siguen pintándose como siempre', async () => {
    sembrar(2);
    vi.spyOn(store, 'leerFotos').mockResolvedValue([UNA, DOS]);
    montar();

    const miniaturas = await screen.findAllByRole('img');
    expect(miniaturas.map(img => img.getAttribute('src'))).toEqual([UNA, DOS]);
    expect(miniaturas[0].getAttribute('alt')).toBe('Foto 1 del cliente');
  });

  it('bloquea el desplazamiento del fondo y lo devuelve al cerrar', async () => {
    sembrar(1);
    vi.spyOn(store, 'leerFotos').mockResolvedValue([UNA]);
    montar();

    expect(document.body.style.overflow).toBe('');
    await abrir(1);
    expect(document.body.style.overflow).toBe('hidden');

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar visor' }));
    expect(document.body.style.overflow).toBe('');
  });

  it('al desmontar la pantalla tampoco deja el fondo bloqueado', async () => {
    sembrar(1);
    vi.spyOn(store, 'leerFotos').mockResolvedValue([UNA]);
    const pantalla = montar();
    await abrir(1);
    expect(document.body.style.overflow).toBe('hidden');

    pantalla.unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
