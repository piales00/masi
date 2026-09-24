import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Postulacion, Solicitud } from '../../../shared/api';

/**
 * La cadena completa, sin atajos: `fetch` → `apiStore` → el polling de siempre →
 * `DemoContext` → la pantalla real dentro de `AppShell`.
 *
 * Los tests anteriores simulaban el almacén y empujaban las vueltas a mano, así que
 * pasaban aunque en el despliegue el aviso no saliera. Este monta lo mismo que corre en
 * el teléfono y comprueba las dos cosas a la vez: que la solicitud entre en la lista de
 * alertas **y** que salga el aviso flotante.
 */
vi.stubEnv('VITE_STORE', 'api');

const CLIENTE = 'cliente-1';
const iso = new Date().toISOString();

const solicitud = (id: string, clienteId = CLIENTE): Solicitud => ({
  id, clienteId, servicio: 'Electricidad', descripcion: `Foco quemado ${id}`,
  fotos: 0, ubicacion: 'Av. 1', distrito: 'Chorrillos', cliente: 'María Torres',
  estado: 'buscando_profesionales', postulacionElegidaId: null, creadaEn: iso, actualizadaEn: iso,
});

const postulacion = (id: string, solicitudId: string, providerNombre: string): Postulacion => ({
  id, solicitudId, providerId: id, providerNombre, providerAddress: null,
  precio: 150, minutos: 30, fecha: iso,
});

/** Lo que el almacén compartido devuelve en la siguiente vuelta del polling. */
let remoto: { solicitudes: Solicitud[]; postulaciones: Postulacion[] };

const cuerpo = (valor: unknown) => new Response(JSON.stringify(valor), {
  status: 200, headers: { 'content-type': 'application/json' },
});

const { DemoProvider } = await import('../demo/DemoContext');
const { AppShell } = await import('./AppShell');
const { CLIENT_NAV, PROVIDER_NAV } = await import('./MainNav');
const { ProviderHomeScreen } = await import('../screens/ProviderHomeScreen');
const { RequestsScreen } = await import('../screens/RequestsScreen');

function sesionDelProfesional() {
  localStorage.setItem('masi.demo.profesional.v2', JSON.stringify({
    id: 'carlos', fullName: 'Carlos Mendoza', services: ['Electricidad'],
    district: 'Chorrillos', yearsExperience: 5, bio: '',
  }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: false, provider: true }));
}

function sesionDelCliente() {
  localStorage.setItem('masi.demo.clienteId.v1', JSON.stringify(CLIENTE));
  localStorage.setItem('masi.demo.cliente.v2', JSON.stringify({
    firstName: 'María', lastName: 'Torres', phone: '9', district: 'Chorrillos', contractId: CLIENTE,
  }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: true, provider: false }));
}

const arbolDelProfesional = () => <DemoProvider>
  <MemoryRouter initialEntries={['/profesional']}>
    <Routes>
      <Route element={<AppShell items={PROVIDER_NAV} role="provider" />}>
        <Route path="/profesional" element={<ProviderHomeScreen />} />
      </Route>
    </Routes>
  </MemoryRouter>
</DemoProvider>;

const arbolDelCliente = () => <DemoProvider>
  <MemoryRouter initialEntries={['/solicitudes']}>
    <Routes>
      <Route element={<AppShell items={CLIENT_NAV} role="client" />}>
        <Route path="/solicitudes" element={<RequestsScreen />} />
      </Route>
    </Routes>
  </MemoryRouter>
</DemoProvider>;

/** Deja que termine la primera lectura del almacén, que es la que fija la línea base. */
const cargaInicial = () => act(async () => {});
/** Una vuelta del polling real, con los 3 s de su intervalo. */
const siguienteVuelta = () => act(async () => { await vi.advanceTimersByTimeAsync(3100); });

const avisoDelProfesional = () => screen.queryByText('Nueva solicitud cerca de ti');
const avisoDelCliente = () => screen.queryByText('Nuevas postulaciones');
const enLaLista = (texto: string) => screen.queryAllByText(texto).length;

beforeEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  remoto = { solicitudes: [solicitud('vieja')], postulaciones: [] };
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/postulaciones')) return cuerpo({ items: remoto.postulaciones });
    if (url.includes('/solicitudes')) return cuerpo({ items: remoto.solicitudes });
    return cuerpo({ items: [] });
  }));
  vi.useFakeTimers();
});

afterEach(() => { vi.useRealTimers(); });

describe('escenario A: la novedad llega con la pantalla abierta', () => {
  it('el profesional la ve en sus alertas y en el aviso flotante', async () => {
    sesionDelProfesional();
    render(arbolDelProfesional());
    await cargaInicial();

    // Lo que ya estaba no avisa, pero sí se lista.
    expect(enLaLista('Foco quemado vieja')).toBe(1);
    expect(avisoDelProfesional()).toBeNull();

    remoto.solicitudes = [solicitud('vieja'), solicitud('nueva')];
    await siguienteVuelta();

    // La alerta de siempre y el aviso nuevo, a la vez: la descripción sale en los dos.
    expect(enLaLista('Foco quemado nueva')).toBe(2);
    expect(avisoDelProfesional()).toBeTruthy();
    expect(screen.getByText('0:30')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver solicitud' })).toBeTruthy();
  });

  it('el cliente recibe el aviso de una postulación nueva a su solicitud', async () => {
    sesionDelCliente();
    render(arbolDelCliente());
    await cargaInicial();
    expect(avisoDelCliente()).toBeNull();

    remoto.postulaciones = [postulacion('p1', 'vieja', 'Carlos Mendoza')];
    await siguienteVuelta();

    expect(avisoDelCliente()).toBeTruthy();
    expect(screen.getByText('1 profesional ha enviado una propuesta.')).toBeTruthy();
  });

  it('la vuelta siguiente no repite el aviso', async () => {
    sesionDelProfesional();
    render(arbolDelProfesional());
    await cargaInicial();

    remoto.solicitudes = [solicitud('vieja'), solicitud('nueva')];
    await siguienteVuelta();
    expect(screen.getAllByText('Nueva solicitud cerca de ti')).toHaveLength(1);

    await siguienteVuelta();
    await siguienteVuelta();
    expect(screen.getAllByText('Nueva solicitud cerca de ti')).toHaveLength(1);
  });
});

describe('la memoria de lo ya visto sobrevive a una recarga', () => {
  it('lo publicado mientras la pestaña se recargaba sí avisa', async () => {
    sesionDelProfesional();
    const primera = render(arbolDelProfesional());
    await cargaInicial();
    expect(avisoDelProfesional()).toBeNull();

    // El navegador del móvil descarta la pestaña en segundo plano y al volver recarga;
    // mientras tanto, el cliente publica. Antes esto reiniciaba la línea base y el aviso
    // no salía nunca, aunque la solicitud sí apareciera en la lista.
    primera.unmount();
    cleanup();
    remoto.solicitudes = [solicitud('vieja'), solicitud('nueva')];

    render(arbolDelProfesional());
    await cargaInicial();

    expect(enLaLista('Foco quemado nueva')).toBe(2);
    expect(avisoDelProfesional()).toBeTruthy();
  });

  it('escenario B: en una pestaña nueva, lo que ya existía no avisa', async () => {
    sesionDelProfesional();
    // Pestaña recién abierta: sin memoria previa, todo lo que haya es línea base.
    remoto.solicitudes = [solicitud('vieja'), solicitud('nueva')];
    render(arbolDelProfesional());
    await cargaInicial();

    expect(enLaLista('Foco quemado nueva')).toBe(1);
    expect(avisoDelProfesional()).toBeNull();
  });
});
