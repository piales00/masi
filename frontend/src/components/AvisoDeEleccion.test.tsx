import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Postulacion, Solicitud } from '../../../shared/api';

/**
 * El aviso de «te eligieron» sale de los mismos datos que ya sincroniza la app, así que
 * se prueba con la cadena de verdad: `fetch` → almacén → polling → contexto → AppShell.
 * Y en el mismo armazón vive la tarjeta inferior de nuevas solicitudes, que tiene que
 * seguir funcionando igual: son dos avisos distintos.
 */
vi.stubEnv('VITE_STORE', 'api');

const CLIENTE = 'cliente-1';
/** Fuera del catálogo: un profesional registrado en la app, sin nota de ejemplo. */
const PRO = 'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K';
const iso = new Date().toISOString();

const solicitud = (id: string, extra: Partial<Solicitud> = {}): Solicitud => ({
  id, clienteId: CLIENTE, servicio: 'Electricidad', descripcion: `Foco quemado ${id}`,
  fotos: 0, ubicacion: 'Av. 1', distrito: 'Chorrillos', cliente: 'María Torres',
  estado: 'buscando_profesionales', postulacionElegidaId: null, creadaEn: iso, actualizadaEn: iso,
  ...extra,
});

const postulacion = (id: string, solicitudId: string): Postulacion => ({
  id, solicitudId, providerId: PRO, providerNombre: 'Carlos Mendoza', providerAddress: null,
  precio: 150, minutos: 30, fecha: iso,
});

/** Lo que el almacén compartido devuelve en la siguiente vuelta. */
let remoto: { solicitudes: Solicitud[]; postulaciones: Postulacion[] };

const cuerpo = (valor: unknown) => new Response(JSON.stringify(valor), {
  status: 200, headers: { 'content-type': 'application/json' },
});

const { DemoProvider } = await import('../demo/DemoContext');
const { AppShell } = await import('./AppShell');
const { PROVIDER_NAV } = await import('./MainNav');
const { ProviderHomeScreen } = await import('../screens/ProviderHomeScreen');

function sesion() {
  localStorage.setItem('masi.demo.profesional.v2', JSON.stringify({
    id: PRO, fullName: 'Carlos Mendoza', services: ['Electricidad'],
    district: 'Chorrillos', yearsExperience: 5, bio: '',
  }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: false, provider: true }));
}

const arbol = () => <DemoProvider>
  <MemoryRouter initialEntries={['/profesional']}>
    <Routes>
      <Route element={<AppShell items={PROVIDER_NAV} role="provider" />}>
        <Route path="/profesional" element={<p>inicio</p>} />
        <Route path="/profesional/solicitudes" element={<p>bandeja</p>} />
        <Route path="/profesional/cotizacion/:solicitudId" element={<p>cotización de {'s1'}</p>} />
      </Route>
    </Routes>
  </MemoryRouter>
</DemoProvider>;

const conHome = () => <DemoProvider>
  <MemoryRouter initialEntries={['/profesional']}>
    <Routes>
      <Route element={<AppShell items={PROVIDER_NAV} role="provider" />}>
        <Route path="/profesional" element={<ProviderHomeScreen />} />
      </Route>
    </Routes>
  </MemoryRouter>
</DemoProvider>;

const cargaInicial = () => act(async () => {});
const siguienteVuelta = () => act(async () => { await vi.advanceTimersByTimeAsync(3100); });

const aviso = () => screen.queryByText('¡Te eligieron para el servicio!');
const avisoInferior = () => screen.queryByText('Nueva solicitud cerca de ti');

/** La solicitud pasa a tener elegida la propuesta de este profesional. */
const eligenAlProfesional = () => {
  remoto.solicitudes = [solicitud('s1', { estado: 'profesional_elegido', postulacionElegidaId: 'p1' })];
};

beforeEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  remoto = { solicitudes: [solicitud('s1')], postulaciones: [postulacion('p1', 's1')] };
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/postulaciones')) return cuerpo({ items: remoto.postulaciones });
    if (url.includes('/solicitudes')) return cuerpo({ items: remoto.solicitudes });
    return cuerpo({ items: [] });
  }));
  vi.useFakeTimers();
});

afterEach(() => { vi.useRealTimers(); });

describe('aviso de «te eligieron»', () => {
  it('avisa cuando el cliente elige la propuesta durante la sesión', async () => {
    sesion();
    render(arbol());
    await cargaInicial();
    expect(aviso()).toBeNull();

    eligenAlProfesional();
    await siguienteVuelta();

    expect(aviso()).toBeTruthy();
    expect(screen.getByText('El cliente seleccionó tu propuesta.')).toBeTruthy();
  });

  it('una elección anterior a la carga inicial no avisa', async () => {
    sesion();
    // Ya estaba elegido antes de abrir: forma parte de la línea base.
    eligenAlProfesional();
    render(arbol());
    await cargaInicial();

    expect(aviso()).toBeNull();
    // Y el contador de siempre sigue contándolo.
    expect(screen.getByText('1 asunto por atender')).toBeTruthy();
  });

  it('no se repite en las vueltas siguientes del polling', async () => {
    sesion();
    render(arbol());
    await cargaInicial();
    eligenAlProfesional();
    await siguienteVuelta();
    expect(screen.getAllByText('¡Te eligieron para el servicio!')).toHaveLength(1);

    await siguienteVuelta();
    await siguienteVuelta();
    expect(screen.getAllByText('¡Te eligieron para el servicio!')).toHaveLength(1);
  });

  it('no reaparece al remontar la pantalla si ya se vio', async () => {
    sesion();
    const primera = render(arbol());
    await cargaInicial();
    eligenAlProfesional();
    await siguienteVuelta();
    expect(aviso()).toBeTruthy();

    primera.unmount();
    cleanup();
    render(arbol());
    await cargaInicial();

    expect(aviso()).toBeNull();
  });

  it('el botón lleva a la cotización de esa solicitud', async () => {
    sesion();
    render(arbol());
    await cargaInicial();
    eligenAlProfesional();
    await siguienteVuelta();

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Enviar cotización final/ })); });

    expect(screen.getByText('cotización de s1')).toBeTruthy();
    expect(aviso()).toBeNull();
  });

  it('se cierra a mano y también solo', async () => {
    sesion();
    render(arbol());
    await cargaInicial();
    eligenAlProfesional();
    await siguienteVuelta();

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' })); });
    expect(aviso()).toBeNull();

    // Y el que llega después se va solo cuando pasa su tiempo.
    remoto.solicitudes = [
      solicitud('s1', { estado: 'profesional_elegido', postulacionElegidaId: 'p1' }),
      solicitud('s2', { estado: 'profesional_elegido', postulacionElegidaId: 'p2' }),
    ];
    remoto.postulaciones = [postulacion('p1', 's1'), postulacion('p2', 's2')];
    await siguienteVuelta();
    expect(aviso()).toBeTruthy();

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(aviso()).toBeNull();
  });

  it('la tarjeta inferior de nuevas solicitudes sigue funcionando', async () => {
    sesion();
    render(arbol());
    await cargaInicial();
    expect(avisoInferior()).toBeNull();

    // Una solicitud compatible nueva: eso lo anuncia el aviso de abajo, no el de arriba.
    remoto.solicitudes = [solicitud('s1'), solicitud('s9')];
    await siguienteVuelta();

    expect(avisoInferior()).toBeTruthy();
    expect(aviso()).toBeNull();
  });
});

describe('el Inicio no se ve como nuevo mientras carga', () => {
  it('espera a saber para decir «Nuevo en Masi», y luego lo dice si es verdad', async () => {
    sesion();
    render(conHome());

    // Primer pintado: la cadena no ha contestado, así que no se afirma nada.
    expect(screen.queryByText('Nuevo en Masi')).toBeNull();

    await cargaInicial();
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });

    // Ya con la respuesta: este profesional sí es nuevo de verdad, y lo dice en la
    // ficha y en la tarjeta de calificación.
    expect(screen.getAllByText('Nuevo en Masi').length).toBeGreaterThan(0);
    expect(screen.getByText('0')).toBeTruthy();
  });
});
