import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/**
 * El aviso flotante sale de los mismos datos que ya sincroniza la app. Con el almacén
 * remoto simulado se controla qué trae cada vuelta, y `visibilitychange` fuerza una
 * relectura sin esperar los tres segundos del ciclo.
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
const { AppShell } = await import('./AppShell');
const { CLIENT_NAV, PROVIDER_NAV } = await import('./MainNav');
const { ProviderActivityScreen } = await import('../screens/ProviderActivityScreen');
const { DURACION_AVISO_MS } = await import('../useNovedades');

const CLIENTE = 'cliente-1';
const iso = new Date().toISOString();

const solicitud = (id: string, extra: Record<string, unknown> = {}) => ({
  id, servicio: 'Electricidad', descripcion: `Se dañó el foco de la cocina en ${id}.`,
  fotos: 0, ubicacion: 'Av. 1', distrito: 'Chorrillos', cuando: 'Hoy', cliente: 'María Torres',
  clienteId: CLIENTE, estado: 'buscando_profesionales', creadaEn: iso, ...extra,
});

const postulacion = (id: string, solicitudId: string, providerNombre: string) => ({
  id, solicitudId, providerId: id, providerNombre, providerAddress: null,
  precio: 150, minutos: 30, fecha: iso,
});

const datos = (solicitudes: unknown[], postulaciones: unknown[] = []) =>
  ({ solicitudes, postulaciones, cotizaciones: [] });

function sembrarSesion() {
  localStorage.setItem('masi.demo.clienteId.v1', JSON.stringify(CLIENTE));
  localStorage.setItem('masi.demo.cliente.v2', JSON.stringify({ firstName: 'María', lastName: 'Torres', phone: '9', district: 'Chorrillos' }));
  localStorage.setItem('masi.demo.profesional.v2', JSON.stringify({
    id: 'carlos', fullName: 'Carlos Mendoza', services: ['Electricidad'], district: 'Chorrillos', yearsExperience: 5, bio: '',
  }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: true, provider: true }));
}

/** El armazón real, que es donde vive el aviso, con una pantalla dentro. */
function pintar(role: 'client' | 'provider', pantalla = <p>pantalla</p>) {
  const inicio = role === 'provider' ? '/profesional/solicitudes' : '/solicitudes';
  return render(<DemoProvider>
    <MemoryRouter initialEntries={[inicio]}>
      <Routes>
        <Route element={<AppShell items={role === 'provider' ? PROVIDER_NAV : CLIENT_NAV} role={role} />}>
          <Route path={inicio} element={pantalla} />
          <Route path="/profesional/alertas/:id" element={<p>detalle de la solicitud</p>} />
          <Route path="/solicitudes/:id" element={<p>tus propuestas</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  </DemoProvider>);
}

/**
 * Espera a que la primera lectura del almacén termine. Es lo que fija la línea base, y
 * sin ella lo que llegue después contaría como «ya estaba».
 */
async function primeraCarga() {
  await waitFor(() => expect(cargar).toHaveBeenCalled());
  await act(async () => {});
}

/** Una vuelta más de sincronización, con lo que devuelva `cargar` en ese momento. */
async function sincronizar() {
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
}

const avisoDelProfesional = () => screen.queryByText('Nueva solicitud cerca de ti');
const avisoDelCliente = () => screen.queryByText('Nuevas postulaciones');

afterEach(() => {
  cleanup();
  cargar.mockReset();
  localStorage.clear();
});

describe('aviso de novedades para el profesional', () => {
  it('lo que ya existía al entrar no avisa de nada', async () => {
    sembrarSesion();
    cargar.mockResolvedValue(datos([solicitud('s1'), solicitud('s2')]));
    pintar('provider');

    await primeraCarga();
    expect(screen.getByText('pantalla')).toBeTruthy();
    await sincronizar();
    expect(avisoDelProfesional()).toBeNull();
    // Y los badges siguen contando lo de siempre: dos solicitudes disponibles.
    expect(screen.getByText('2 solicitudes disponibles')).toBeTruthy();
  });

  it('una solicitud que llega después sí avisa', async () => {
    sembrarSesion();
    cargar.mockResolvedValue(datos([solicitud('s1')]));
    pintar('provider');
    await primeraCarga();
    expect(screen.getByText('pantalla')).toBeTruthy();

    cargar.mockResolvedValue(datos([solicitud('s1'), solicitud('s2')]));
    await sincronizar();

    expect(await screen.findByText('Nueva solicitud cerca de ti')).toBeTruthy();
    expect(screen.getByText('Se dañó el foco de la cocina en s2.')).toBeTruthy();
    expect(screen.getByText('Electricidad')).toBeTruthy();
    expect(screen.getByText('· Chorrillos')).toBeTruthy();
    expect(screen.getByText('0:30')).toBeTruthy();
  });

  it('la misma solicitud no vuelve a avisar en cada vuelta', async () => {
    sembrarSesion();
    cargar.mockResolvedValue(datos([]));
    pintar('provider');
    await primeraCarga();
    expect(screen.getByText('pantalla')).toBeTruthy();

    cargar.mockResolvedValue(datos([solicitud('s1')]));
    await sincronizar();
    await userEvent.click(await screen.findByRole('button', { name: 'Ahora no' }));
    expect(avisoDelProfesional()).toBeNull();

    // Dos vueltas más con exactamente lo mismo: no reaparece.
    await sincronizar();
    await sincronizar();
    expect(avisoDelProfesional()).toBeNull();
  });

  it('«Ahora no» cierra el aviso y deja la solicitud intacta', async () => {
    sembrarSesion();
    cargar.mockResolvedValue(datos([]));
    pintar('provider', <ProviderActivityScreen />);
    await primeraCarga();

    cargar.mockResolvedValue(datos([solicitud('s1')]));
    await sincronizar();
    await userEvent.click(await screen.findByRole('button', { name: 'Ahora no' }));

    expect(avisoDelProfesional()).toBeNull();
    // Sigue publicada, disponible y contada como siempre.
    expect(screen.getByText('Se dañó el foco de la cocina en s1.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Solicitudes de clientes' })).toBeTruthy();
    expect(screen.getByText('1 solicitud disponible')).toBeTruthy();
  });

  it('al acabarse el tiempo desaparece el aviso, no la solicitud', async () => {
    vi.useFakeTimers();
    try {
      sembrarSesion();
      cargar.mockResolvedValue(datos([]));
      pintar('provider', <ProviderActivityScreen />);
      await act(async () => {});
      expect(cargar).toHaveBeenCalled();

      cargar.mockResolvedValue(datos([solicitud('s1')]));
      await sincronizar();
      expect(avisoDelProfesional()).toBeTruthy();

      await act(async () => { vi.advanceTimersByTime(DURACION_AVISO_MS); });

      expect(avisoDelProfesional()).toBeNull();
      expect(screen.getByText('Se dañó el foco de la cocina en s1.')).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Solicitudes de clientes' })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('«Ver solicitud» abre el detalle de esa solicitud', async () => {
    sembrarSesion();
    cargar.mockResolvedValue(datos([]));
    pintar('provider');
    await primeraCarga();
    expect(screen.getByText('pantalla')).toBeTruthy();

    cargar.mockResolvedValue(datos([solicitud('s7')]));
    await sincronizar();
    await userEvent.click(await screen.findByRole('button', { name: 'Ver solicitud' }));

    expect(await screen.findByText('detalle de la solicitud')).toBeTruthy();
    expect(avisoDelProfesional()).toBeNull();
  });
});

describe('aviso de novedades para el cliente', () => {
  it('avisa de una postulación nueva a su solicitud', async () => {
    sembrarSesion();
    cargar.mockResolvedValue(datos([solicitud('s1')]));
    pintar('client');
    await primeraCarga();
    expect(screen.getByText('pantalla')).toBeTruthy();

    cargar.mockResolvedValue(datos([solicitud('s1')], [postulacion('p1', 's1', 'Carlos Mendoza')]));
    await sincronizar();

    expect(await screen.findByText('Nuevas postulaciones')).toBeTruthy();
    expect(screen.getByText('1 profesional ha enviado una propuesta.')).toBeTruthy();
  });

  it('varias postulaciones de la misma solicitud actualizan un único aviso', async () => {
    sembrarSesion();
    cargar.mockResolvedValue(datos([solicitud('s1')]));
    pintar('client');
    await primeraCarga();
    expect(screen.getByText('pantalla')).toBeTruthy();

    cargar.mockResolvedValue(datos([solicitud('s1')], [postulacion('p1', 's1', 'Carlos Mendoza')]));
    await sincronizar();
    await screen.findByText('1 profesional ha enviado una propuesta.');

    cargar.mockResolvedValue(datos(
      [solicitud('s1')],
      [postulacion('p1', 's1', 'Carlos Mendoza'), postulacion('p2', 's1', 'Rosa Quispe'), postulacion('p3', 's1', 'Luis Torres')],
    ));
    await sincronizar();

    expect(await screen.findByText('3 profesionales han enviado una propuesta.')).toBeTruthy();
    // Un solo aviso, no tres apilados.
    expect(screen.getAllByText('Nuevas postulaciones')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Revisar postulaciones' })).toHaveLength(1);
  });

  it('«Revisar postulaciones» lleva a su solicitud', async () => {
    sembrarSesion();
    cargar.mockResolvedValue(datos([solicitud('s1')]));
    pintar('client');
    await primeraCarga();
    expect(screen.getByText('pantalla')).toBeTruthy();

    cargar.mockResolvedValue(datos([solicitud('s1')], [postulacion('p1', 's1', 'Carlos Mendoza')]));
    await sincronizar();
    await userEvent.click(await screen.findByRole('button', { name: 'Revisar postulaciones' }));

    expect(await screen.findByText('tus propuestas')).toBeTruthy();
  });

  it('las postulaciones a la solicitud de otro cliente no le avisan', async () => {
    sembrarSesion();
    cargar.mockResolvedValue(datos([solicitud('ajena', { clienteId: 'otro-cliente' })]));
    pintar('client');
    await primeraCarga();
    expect(screen.getByText('pantalla')).toBeTruthy();

    cargar.mockResolvedValue(datos(
      [solicitud('ajena', { clienteId: 'otro-cliente' })],
      [postulacion('p1', 'ajena', 'Carlos Mendoza')],
    ));
    await sincronizar();

    expect(avisoDelCliente()).toBeNull();
  });
});

describe('la tarjeta es la misma para los dos roles', () => {
  /** Saca el HTML de la tarjeta del aviso, que es donde viven sus colores. */
  async function tarjetaDe(role: 'client' | 'provider') {
    sembrarSesion();
    cargar.mockResolvedValue(datos([solicitud('s1')]));
    const { container } = pintar(role);
    await primeraCarga();
    expect(screen.getByText('pantalla')).toBeTruthy();

    cargar.mockResolvedValue(role === 'provider'
      ? datos([solicitud('s1'), solicitud('s2')])
      : datos([solicitud('s1')], [postulacion('p1', 's1', 'Carlos Mendoza')]));
    await sincronizar();
    await screen.findByText(role === 'provider' ? 'Nueva solicitud cerca de ti' : 'Nuevas postulaciones');

    return container.querySelector('.animate-masi-rise')!.outerHTML;
  }

  it('los dos usan el azul de Masi y ninguno el naranja', async () => {
    const profesional = await tarjetaDe('provider');
    expect(profesional).toContain('bg-masi-blue');
    expect(profesional).not.toContain('masi-orange');

    cleanup();
    cargar.mockReset();
    localStorage.clear();

    const cliente = await tarjetaDe('client');
    expect(cliente).toContain('bg-masi-blue');
    expect(cliente).not.toContain('masi-orange');
  });
});
