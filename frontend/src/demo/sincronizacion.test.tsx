import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

/**
 * El almacen compartido manda en modo API. Estas pruebas fijan que el localStorage no
 * se cuele en el primer render: mostrarlo y que la respuesta real lo borrara era el
 * parpadeo de "la solicitud aparece y luego desaparece".
 */
const remoto = { valor: true };
const cargar = vi.fn();

vi.mock('./store', () => ({
  store: {
    get remoto() { return remoto.valor; },
    cargar: () => cargar(),
    crearSolicitud: vi.fn(), crearPostulacion: vi.fn(), elegir: vi.fn(),
    crearCotizacion: vi.fn(), patchCotizacion: vi.fn(),
    leerResena: vi.fn(), guardarResena: vi.fn(),
  },
}));

const { DemoProvider, useDemo } = await import('./DemoContext');

const iso = new Date().toISOString();
const solicitud = (id: string, servicio = 'Pintura') => ({
  id, servicio, descripcion: `Trabajo ${id}`, fotos: [], ubicacion: 'Av. 1',
  distrito: 'Surco', cuando: 'Hoy', cliente: 'Piero', clienteId: 'cliente-1',
  estado: 'buscando_profesionales', creadaEn: iso,
});

function Espia() {
  const { solicitudes, cargando } = useDemo();
  return <div>
    <p data-testid="cargando">{String(cargando)}</p>
    <p data-testid="ids">{solicitudes.map(s => s.id).join(',')}</p>
  </div>;
}

const pintar = () => render(<DemoProvider><Espia /></DemoProvider>);
const ids = () => screen.getByTestId('ids').textContent;

afterEach(() => { cleanup(); cargar.mockReset(); localStorage.clear(); remoto.valor = true; });

describe('modo API', () => {
  it('no pinta restos del localStorage antes de la primera respuesta', async () => {
    localStorage.setItem('masi.demo.solicitudes.v1', JSON.stringify([solicitud('vieja')]));
    cargar.mockResolvedValue({ solicitudes: [], postulaciones: [], cotizaciones: [] });

    pintar();
    // Justo tras el primer render, antes de que resuelva la carga.
    expect(ids()).toBe('');
    expect(screen.getByTestId('cargando').textContent).toBe('true');

    await waitFor(() => expect(screen.getByTestId('cargando').textContent).toBe('false'));
    expect(ids()).toBe('');
  });

  it('muestra lo que devuelve el almacen compartido', async () => {
    cargar.mockResolvedValue({ solicitudes: [solicitud('nueva')], postulaciones: [], cotizaciones: [] });
    pintar();
    await waitFor(() => expect(ids()).toBe('nueva'));
  });

  it('deja de cargar aunque la lectura falle, para no quedarse colgado', async () => {
    cargar.mockRejectedValue(new Error('RPC caido'));
    pintar();
    await waitFor(() => expect(screen.getByTestId('cargando').textContent).toBe('false'));
    expect(ids()).toBe('');
  });
});

describe('modo local', () => {
  it('sigue leyendo del localStorage, que ahi si es la fuente', async () => {
    remoto.valor = false;
    localStorage.setItem('masi.demo.solicitudes.v1', JSON.stringify([solicitud('local')]));
    cargar.mockResolvedValue(null);

    pintar();
    expect(ids()).toBe('local');
    // Sin almacen remoto no hay primera carga pendiente que esperar.
    expect(screen.getByTestId('cargando').textContent).toBe('false');
  });
});
