import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoProvider } from '../demo/DemoContext';
import { mockRatingSource } from '../marketplace';

/**
 * Un profesional que se registra en la app no está en `providers.json`. Su reputación
 * vive en el contrato, y estas pruebas fijan que el cliente la vea igual que la de
 * cualquier otro. El propio profesional no la ve: es una decisión de producto.
 */
const NUEVO = 'CC7TK7EBJT46ECHSE726ALGNVGNTHSHJA65BCGRCLS7E4UQ5TPYMMXKO';
const rating_of = vi.fn(async (address: string) =>
  address === NUEVO
    ? { stars_sum: 4, rating_count: 1, completed_jobs: 1, disputes: 0 }
    : mockRatingSource.rating_of(address));

vi.mock('../dataSource', () => ({ ratingSource: { rating_of: (address: string) => rating_of(address) } }));
vi.mock('../passkeys', () => ({ confirmDemoIdentity: vi.fn() }));

const { RequestDetailScreen } = await import('./RequestDetailScreen');
const { ProposalDetailScreen } = await import('./ProposalDetailScreen');

const CLIENTE = 'cliente-1';
const iso = new Date().toISOString();
const SOLICITUD = 's-1';
const PROPUESTA = 'p-1';

function sembrar() {
  localStorage.clear();
  localStorage.setItem('masi.demo.clienteId.v1', JSON.stringify(CLIENTE));
  localStorage.setItem('masi.demo.cliente.v2', JSON.stringify({ firstName: 'Piero', lastName: 'Pérez', phone: '9', district: 'Chorrillos' }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: true, provider: false }));
  localStorage.setItem('masi.demo.solicitudes.v1', JSON.stringify([{
    id: SOLICITUD, servicio: 'Instalaciones', descripcion: 'Se malogró mi tele', fotos: [],
    ubicacion: 'Av. 1', distrito: 'Chorrillos', cuando: 'Hoy', cliente: 'Piero Pérez',
    clienteId: CLIENTE, estado: 'buscando_profesionales', creadaEn: iso,
  }]));
  localStorage.setItem('masi.demo.postulaciones.v1', JSON.stringify([{
    id: PROPUESTA, solicitudId: SOLICITUD, providerId: NUEVO, providerNombre: 'Marely Salas',
    providerAddress: NUEVO, precio: 100, minutos: 20, fecha: iso,
  }]));
}

const pintar = (ruta: string) => render(
  <MemoryRouter initialEntries={[ruta]}>
    <DemoProvider>
      <Routes>
        <Route path="/solicitudes/:id" element={<RequestDetailScreen />} />
        <Route path="/solicitudes/:id/propuesta/:postulacionId" element={<ProposalDetailScreen />} />
      </Routes>
    </DemoProvider>
  </MemoryRouter>,
);

afterEach(() => { cleanup(); rating_of.mockClear(); });

describe('reputación de un profesional fuera del catálogo', () => {
  it('la lista de propuestas muestra sus estrellas, no "Nuevo en Masi"', async () => {
    sembrar();
    pintar(`/solicitudes/${SOLICITUD}`);

    expect(await screen.findByText('4.0')).toBeTruthy();
    expect(screen.queryByText('Nuevo en Masi')).toBeNull();
    expect(rating_of).toHaveBeenCalledWith(NUEVO);
  });

  it('su perfil muestra los trabajos completados y las valoraciones', async () => {
    sembrar();
    pintar(`/solicitudes/${SOLICITUD}/propuesta/${PROPUESTA}`);

    expect(await screen.findByText('4.0')).toBeTruthy();
    expect(screen.getByText('1 trabajo completado · 1 valoración')).toBeTruthy();
  });

  it('sin valoraciones sigue diciendo "Nuevo en Masi"', async () => {
    rating_of.mockImplementation(async (address: string) =>
      address === NUEVO
        ? { stars_sum: 0, rating_count: 0, completed_jobs: 0, disputes: 0 }
        : mockRatingSource.rating_of(address));
    sembrar();
    pintar(`/solicitudes/${SOLICITUD}`);

    await waitFor(() => expect(rating_of).toHaveBeenCalledWith(NUEVO));
    expect(await screen.findByText('Nuevo en Masi')).toBeTruthy();
  });
});
