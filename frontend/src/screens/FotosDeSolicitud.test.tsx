import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoProvider } from '../demo/DemoContext';
import { store } from '../demo/store';
import { ProviderAlertScreen } from './ProviderAlertScreen';
import { RequestDetailScreen } from './RequestDetailScreen';

// El detalle del cliente firma con passkeys; aquí solo se abren pantallas, no se firma.
vi.mock('../passkeys', () => ({ confirmDemoIdentity: vi.fn() }));

/**
 * Las fotos ya no viajan dentro de la solicitud: el listado solo dice cuántas son y las
 * imágenes se piden al abrirla. Esto fija esa costura desde las dos pantallas que las
 * enseñan, que son las que deciden si el profesional acepta el trabajo.
 */
const CLIENTE = 'cliente-1';
const UNA = 'data:image/jpeg;base64,aaaa';
const OTRA = 'data:image/jpeg;base64,bbbb';
const iso = new Date().toISOString();

const solicitud = (id: string, fotos: number) => ({
  id, servicio: 'Pintura', descripcion: 'Pintar la sala', fotos, ubicacion: 'Av. 1',
  distrito: 'Chorrillos', cuando: 'Hoy', cliente: 'Samuel Ortega', clienteId: CLIENTE,
  estado: 'buscando_profesionales', creadaEn: iso,
});

function sembrar(...filas: ReturnType<typeof solicitud>[]) {
  localStorage.setItem('masi.demo.clienteId.v1', JSON.stringify(CLIENTE));
  localStorage.setItem('masi.demo.cliente.v2', JSON.stringify({ firstName: 'Samuel', lastName: 'Ortega', phone: '9', district: 'Chorrillos' }));
  localStorage.setItem('masi.demo.profesional.v2', JSON.stringify({
    id: 'juan', fullName: 'Juan Ramírez', services: ['Pintura'], district: 'Surco', yearsExperience: 8, bio: '',
  }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: true, provider: true }));
  localStorage.setItem('masi.demo.solicitudes.v1', JSON.stringify(filas));
}

const alerta = (id = 's1') => render(<DemoProvider>
  <MemoryRouter initialEntries={[`/profesional/alertas/${id}`]}>
    <Routes><Route path="/profesional/alertas/:id" element={<ProviderAlertScreen />} /></Routes>
  </MemoryRouter>
</DemoProvider>);

const detalle = (id = 's1') => render(<DemoProvider>
  <MemoryRouter initialEntries={[`/solicitudes/${id}`]}>
    <Routes><Route path="/solicitudes/:id" element={<RequestDetailScreen />} /></Routes>
  </MemoryRouter>
</DemoProvider>);

const fuentes = () => screen.getAllByRole('img').map(img => img.getAttribute('src'));

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('el profesional abre una solicitud con fotos', () => {
  it('ve las imágenes que subió el cliente', async () => {
    sembrar(solicitud('s1', 2));
    vi.spyOn(store, 'leerFotos').mockResolvedValue([UNA, OTRA]);
    alerta();

    await waitFor(() => expect(fuentes()).toEqual([UNA, OTRA]));
    expect(screen.getByAltText('Foto 1 del cliente')).toBeTruthy();
  });

  it('sin fotos no pide nada y lo dice', async () => {
    sembrar(solicitud('s1', 0));
    const espia = vi.spyOn(store, 'leerFotos');
    alerta();

    expect(await screen.findByText('El cliente no adjuntó fotos.')).toBeTruthy();
    // Una solicitud sin fotos no gasta una petición en descubrirlo.
    expect(espia).not.toHaveBeenCalled();
  });

  it('mientras cargan deja huecos del tamaño de las miniaturas', async () => {
    sembrar(solicitud('s1', 2));
    let entregar: (fotos: string[]) => void = () => {};
    vi.spyOn(store, 'leerFotos').mockReturnValue(new Promise(resolve => { entregar = resolve; }));
    const { container } = alerta();

    // Tantos huecos como fotos: cuando lleguen, la maquetación no da un salto.
    await waitFor(() => expect(container.querySelectorAll('.animate-pulse')).toHaveLength(2));
    expect(screen.queryAllByRole('img')).toHaveLength(0);

    entregar([UNA, OTRA]);
    await waitFor(() => expect(fuentes()).toEqual([UNA, OTRA]));
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
  });

  it('si fallan, la pantalla sigue sirviendo para postular', async () => {
    sembrar(solicitud('s1', 2));
    vi.spyOn(store, 'leerFotos').mockRejectedValue(new Error('Algo salió mal. Inténtalo de nuevo.'));
    alerta();

    expect(await screen.findByText('No pudimos cargar las fotos.')).toBeTruthy();
    expect(screen.getByText('Pintar la sala')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Enviar mi propuesta/ })).toBeTruthy();
  });

  it('nunca enseña las fotos de otra solicitud', async () => {
    sembrar(solicitud('s1', 1), solicitud('s2', 1));
    vi.spyOn(store, 'leerFotos').mockImplementation(async id => (id === 's1' ? [UNA] : [OTRA]));
    alerta('s2');

    await waitFor(() => expect(fuentes()).toEqual([OTRA]));
    expect(fuentes()).not.toContain(UNA);
  });
});

describe('en modo local, sin tocar el almacén', () => {
  it('recupera las fotos de solicitudes guardadas antes de este cambio', async () => {
    // Los registros viejos llevaban las data URL dentro de la propia solicitud.
    sembrar({ ...solicitud('s1', 0), fotos: [UNA] } as unknown as ReturnType<typeof solicitud>);
    alerta();

    await waitFor(() => expect(fuentes()).toEqual([UNA]));
  });
});

describe('el cliente vuelve a abrir su solicitud', () => {
  it('ve sus fotos aunque sea desde otro teléfono', async () => {
    sembrar(solicitud('s1', 1));
    vi.spyOn(store, 'leerFotos').mockResolvedValue([UNA]);
    detalle();

    await waitFor(() => expect(screen.getByAltText('Foto 1 de la solicitud')).toBeTruthy());
    expect(fuentes()).toContain(UNA);
  });

  it('sin fotos no dibuja hueco ni pide nada', async () => {
    sembrar(solicitud('s1', 0));
    const espia = vi.spyOn(store, 'leerFotos');
    detalle();

    expect(await screen.findByText('Pintar la sala')).toBeTruthy();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(espia).not.toHaveBeenCalled();
  });
});
