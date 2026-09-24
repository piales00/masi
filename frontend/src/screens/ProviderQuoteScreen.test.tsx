import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/**
 * Abrir la cotización final con el almacén compartido todavía respondiendo: es lo que
 * pasa al tocar el aviso de «te eligieron» con la pestaña recién cargada. El almacén se
 * simula para poder decidir cuándo contesta.
 */
const cargar = vi.fn();
vi.mock('../demo/store', () => ({
  store: {
    remoto: true,
    cargar: () => cargar(),
    crearSolicitud: vi.fn(), leerFotos: vi.fn(), crearPostulacion: vi.fn(), elegir: vi.fn(),
    crearCotizacion: vi.fn(), patchCotizacion: vi.fn(),
    leerResena: vi.fn(), leerResenasDe: vi.fn(), guardarResena: vi.fn(),
  },
}));

const { DemoProvider } = await import('../demo/DemoContext');
const { ProviderQuoteScreen } = await import('./ProviderQuoteScreen');

const PRO = 'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K';
const iso = new Date().toISOString();
const DESCRIPCION = 'Pintar la sala y el pasillo, dos manos.';

const solicitud = (descripcion = DESCRIPCION) => ({
  id: 's1', servicio: 'Pintura', descripcion, fotos: 0, ubicacion: 'Av. 1',
  distrito: 'Chorrillos', cuando: 'Hoy', cliente: 'María Torres', clienteId: 'cliente-1',
  estado: 'profesional_elegido', postulacionElegidaId: 'p1', creadaEn: iso,
});

const postulacion = () => ({
  id: 'p1', solicitudId: 's1', providerId: PRO, providerNombre: 'Carlos Mendoza',
  providerAddress: PRO, precio: 150, minutos: 30, fecha: iso,
});

const datos = (descripcion?: string) => ({
  solicitudes: [solicitud(descripcion)], postulaciones: [postulacion()], cotizaciones: [],
});

function sesion() {
  localStorage.setItem('masi.demo.profesional.v2', JSON.stringify({
    id: PRO, fullName: 'Carlos Mendoza', services: ['Pintura'],
    district: 'Chorrillos', yearsExperience: 5, bio: '',
  }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: false, provider: true }));
}

const pintar = () => render(<DemoProvider>
  <MemoryRouter initialEntries={['/profesional/cotizacion/s1']}>
    <Routes>
      <Route path="/profesional/cotizacion/:solicitudId" element={<ProviderQuoteScreen />} />
      <Route path="/profesional/solicitudes" element={<p>bandeja</p>} />
    </Routes>
  </MemoryRouter>
</DemoProvider>);

/** Deja que termine la carga que estuviera en vuelo. */
const asentar = () => act(async () => {});
/** Otra vuelta del polling, con lo que devuelva `cargar` en ese momento. */
const siguienteVuelta = () => act(async () => { document.dispatchEvent(new Event('visibilitychange')); });

const campo = () => screen.getByRole('textbox', { name: 'Descripción' }) as HTMLTextAreaElement;

beforeEach(() => {
  cleanup();
  localStorage.clear();
  sesion();
});

afterEach(() => { cargar.mockReset(); });

describe('la solicitud llega después del primer render', () => {
  it('no echa de la pantalla mientras el almacén responde', async () => {
    // La carga no resuelve todavía.
    cargar.mockReturnValue(new Promise(() => {}));
    pintar();

    expect(screen.queryByText('bandeja')).toBeNull();
    expect(screen.getByText('Cargando la solicitud…')).toBeTruthy();
  });

  it('cuando llega, el borrador arranca con su descripción', async () => {
    let entregar: (valor: unknown) => void = () => {};
    cargar.mockReturnValue(new Promise(resolve => { entregar = resolve; }));
    pintar();
    expect(screen.queryByRole('textbox', { name: 'Descripción' })).toBeNull();

    await act(async () => { entregar(datos()); });

    expect(campo().value).toBe(DESCRIPCION);
  });

  it('si ya estaba en el primer render, se comporta como siempre', async () => {
    cargar.mockResolvedValue(datos());
    pintar();
    await asentar();

    expect(campo().value).toBe(DESCRIPCION);
  });

  it('no pisa lo que el profesional ya escribió', async () => {
    cargar.mockResolvedValue(datos());
    pintar();
    await asentar();

    fireEvent.change(campo(), { target: { value: 'Incluye lijado previo de las paredes.' } });
    expect(campo().value).toBe('Incluye lijado previo de las paredes.');

    // Otra vuelta del polling, incluso con el texto cambiado en el origen.
    cargar.mockResolvedValue(datos('Texto distinto desde el cliente.'));
    await siguienteVuelta();
    await siguienteVuelta();

    expect(campo().value).toBe('Incluye lijado previo de las paredes.');
  });

  it('si la solicitud no es suya, sigue mandando a Solicitudes', async () => {
    cargar.mockResolvedValue({
      solicitudes: [solicitud()],
      postulaciones: [{ ...postulacion(), providerId: 'otro-profesional' }],
      cotizaciones: [],
    });
    pintar();
    await asentar();

    expect(screen.getByText('bandeja')).toBeTruthy();
  });
});
