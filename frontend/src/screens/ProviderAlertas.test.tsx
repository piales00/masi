import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * El profesional solo ve solicitudes de los oficios que ofrece. Cuando su pantalla está
 * vacía pero hay trabajo publicado, tiene que quedar claro por qué: sin eso parece
 * averiado lo que funciona.
 */
const cargar = vi.fn();
vi.mock('../demo/store', () => ({
  store: {
    remoto: true,
    cargar: () => cargar(),
    crearSolicitud: vi.fn(), crearPostulacion: vi.fn(), elegir: vi.fn(),
    crearCotizacion: vi.fn(), patchCotizacion: vi.fn(),
    leerResena: vi.fn(), guardarResena: vi.fn(),
  },
}));

const { DemoProvider } = await import('../demo/DemoContext');
const { ProviderHomeScreen } = await import('./ProviderHomeScreen');

const iso = new Date().toISOString();
const solicitud = (id: string, servicio: string) => ({
  id, servicio, descripcion: `Trabajo ${id}`, fotos: [], ubicacion: 'Av. 1',
  distrito: 'Surco', cuando: 'Hoy', cliente: 'Piero', clienteId: 'cliente-1',
  estado: 'buscando_profesionales', creadaEn: iso,
});

function sembrarProfesional(services: string[]) {
  localStorage.clear();
  localStorage.setItem('masi.demo.profesional.v2', JSON.stringify({
    id: 'CAPY', fullName: 'Jossep', services, district: 'Surco', yearsExperience: 3, bio: '', contractId: 'CAPY',
  }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: false, provider: true }));
}

const pintar = () => render(<MemoryRouter><DemoProvider><ProviderHomeScreen /></DemoProvider></MemoryRouter>);

afterEach(() => { cleanup(); cargar.mockReset(); localStorage.clear(); });

describe('alertas del profesional', () => {
  it('muestra las solicitudes de su oficio', async () => {
    sembrarProfesional(['Electricidad']);
    cargar.mockResolvedValue({ solicitudes: [solicitud('s1', 'Electricidad')], postulaciones: [], cotizaciones: [] });
    pintar();
    await waitFor(() => expect(screen.getByText('Trabajo s1')).toBeTruthy());
  });

  it('mientras carga no afirma que no hay ninguna', () => {
    sembrarProfesional(['Electricidad']);
    cargar.mockResolvedValue({ solicitudes: [], postulaciones: [], cotizaciones: [] });
    pintar();
    expect(screen.getByText('Buscando solicitudes…')).toBeTruthy();
    expect(screen.queryByText(/Todavía no hay solicitudes/)).toBeNull();
  });

  it('nombra sus oficios, que es lo que revela un registro equivocado', async () => {
    sembrarProfesional(['Pintura']);
    cargar.mockResolvedValue({ solicitudes: [solicitud('s1', 'Electricidad')], postulaciones: [], cotizaciones: [] });
    pintar();
    expect(await screen.findByText(/tus servicios \(Pintura\)/)).toBeTruthy();
  });

  it('avisa de que hay trabajo abierto de otros oficios', async () => {
    sembrarProfesional(['Pintura']);
    cargar.mockResolvedValue({
      solicitudes: [solicitud('s1', 'Electricidad'), solicitud('s2', 'Gasfitería'), solicitud('s3', 'Electricidad')],
      postulaciones: [], cotizaciones: [],
    });
    pintar();
    // Sin repetir Electricidad dos veces.
    expect(await screen.findByText(/hay solicitudes de Electricidad, Gasfitería, que no están entre los tuyos/)).toBeTruthy();
  });

  it('no inventa ese aviso cuando de verdad no hay nada publicado', async () => {
    sembrarProfesional(['Pintura']);
    cargar.mockResolvedValue({ solicitudes: [], postulaciones: [], cotizaciones: [] });
    pintar();
    expect(await screen.findByText(/Todavía no hay solicitudes de Pintura/)).toBeTruthy();
    expect(screen.queryByText(/que no están entre los tuyos/)).toBeNull();
  });

  it('ya no dice "en tu zona": el filtro no mira el distrito', async () => {
    sembrarProfesional(['Pintura']);
    cargar.mockResolvedValue({ solicitudes: [], postulaciones: [], cotizaciones: [] });
    pintar();
    await screen.findByText(/Todavía no hay solicitudes de Pintura/);
    expect(screen.queryByText(/en tu zona/)).toBeNull();
  });
});
