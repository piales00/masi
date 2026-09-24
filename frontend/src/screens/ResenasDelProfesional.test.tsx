import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Resena } from '../../../shared/api';
import { DemoProvider } from '../demo/DemoContext';
import { store } from '../demo/store';
import { ratingSource } from '../dataSource';
import { ProposalDetailScreen } from './ProposalDetailScreen';

const CLIENTE = 'cliente-1';
/** Fuera del catálogo: un profesional registrado en la app. */
const PRO = 'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K';
const iso = new Date().toISOString();

function sembrar() {
  localStorage.setItem('masi.demo.clienteId.v1', JSON.stringify(CLIENTE));
  localStorage.setItem('masi.demo.cliente.v2', JSON.stringify({ firstName: 'Samuel', lastName: 'Ortega', phone: '9', district: 'Chorrillos' }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: true, provider: false }));
  localStorage.setItem('masi.demo.solicitudes.v1', JSON.stringify([{
    id: 's1', servicio: 'Pintura', descripcion: 'Pintar la sala', fotos: [], ubicacion: 'Av. 1',
    distrito: 'Chorrillos', cuando: 'Hoy', cliente: 'Samuel Ortega', clienteId: CLIENTE,
    estado: 'buscando_profesionales', creadaEn: iso,
  }]));
  localStorage.setItem('masi.demo.postulaciones.v1', JSON.stringify([{
    id: 'p1', solicitudId: 's1', providerId: PRO, providerNombre: 'Ana Quispe',
    providerAddress: PRO, precio: 120, minutos: 30, fecha: iso,
  }]));
}

async function conResena(jobId: string, estrellas: 1 | 2 | 3 | 4 | 5, texto: string) {
  await store.guardarResena(jobId, {
    providerId: PRO, providerAddress: PRO, estrellas, texto, hash: 'a'.repeat(64),
  });
}

const montar = () => render(<DemoProvider>
  <MemoryRouter initialEntries={['/solicitudes/s1/propuesta/p1']}>
    <Routes><Route path="/solicitudes/:id/propuesta/:postulacionId" element={<ProposalDetailScreen />} /></Routes>
  </MemoryRouter>
</DemoProvider>);

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('comentarios de clientes en el perfil del profesional', () => {
  it('muestra los textos de las reseñas que existen', async () => {
    sembrar();
    await conResena('1', 5, 'Llegó puntual y dejó todo limpio.');
    await conResena('2', 4, 'Buen trabajo, tardó un poco más.');
    montar();

    expect(await screen.findByRole('heading', { name: 'Lo que dicen sus clientes' })).toBeTruthy();
    expect(screen.getByText('Llegó puntual y dejó todo limpio.')).toBeTruthy();
    expect(screen.getByText('Buen trabajo, tardó un poco más.')).toBeTruthy();
    // Cada reseña lleva sus propias estrellas, accesibles como texto.
    expect(screen.getByLabelText('5 de 5 estrellas')).toBeTruthy();
    expect(screen.getByLabelText('4 de 5 estrellas')).toBeTruthy();
  });

  it('sin reseñas la sección existe y lo dice, sin inventarse nada', async () => {
    sembrar();
    montar();

    expect(await screen.findByRole('heading', { name: 'Lo que dicen sus clientes' })).toBeTruthy();
    expect(screen.getByText('Todavía no tiene opiniones.')).toBeTruthy();
    // Un hueco vacío no puede traer estrellas ni comentarios de ninguna parte.
    expect(screen.queryByLabelText(/de 5 estrellas/)).toBeNull();
    expect(document.querySelectorAll('#opiniones ~ ul li')).toHaveLength(0);
  });

  it('mientras se leen las opiniones no dice que no tenga ninguna', async () => {
    sembrar();
    let entregar: (resenas: Resena[]) => void = () => {};
    vi.spyOn(store, 'leerResenasDe').mockReturnValue(new Promise(resolve => { entregar = resolve; }));
    montar();

    // Primer pintado: la consulta sigue en vuelo, así que no se afirma nada.
    expect(await screen.findByText('Su propuesta')).toBeTruthy();
    expect(screen.queryByText('Todavía no tiene opiniones.')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Lo que dicen sus clientes' })).toBeNull();

    await act(async () => { entregar([]); });

    expect(screen.getByText('Todavía no tiene opiniones.')).toBeTruthy();
  });

  it('el profesional que ya tiene una reseña la enseña al postular a otra solicitud', async () => {
    // La reseña quedó de un trabajo anterior; esta es una solicitud nueva suya.
    sembrar();
    await conResena('7', 5, 'Resolvió la fuga en media hora.');
    montar();

    expect(await screen.findByRole('heading', { name: 'Lo que dicen sus clientes' })).toBeTruthy();
    expect(screen.getByText('Resolvió la fuga en media hora.')).toBeTruthy();
    expect(screen.queryByText('Todavía no tiene opiniones.')).toBeNull();
  });

  it('las reseñas de otro profesional no se cuelan', async () => {
    sembrar();
    await store.guardarResena('9', {
      providerId: 'otro', providerAddress: 'COTRO', estrellas: 1,
      texto: 'Pésimo servicio.', hash: 'b'.repeat(64),
    });
    montar();

    expect(await screen.findByText('Su propuesta')).toBeTruthy();
    expect(screen.queryByText('Pésimo servicio.')).toBeNull();
  });

  it('si fallan las reseñas la pantalla sigue en pie', async () => {
    sembrar();
    const espia = vi.spyOn(store, 'leerResenasDe').mockRejectedValue(new Error('Algo salió mal. Inténtalo de nuevo.'));
    montar();

    // La propuesta y la reputación siguen ahí; solo faltan los comentarios.
    expect(await screen.findByText('Su propuesta')).toBeTruthy();
    expect(screen.getAllByRole('heading', { name: 'Ana Quispe' }).length).toBeGreaterThan(0);
    // Si la consulta falla no se afirma nada: ni opiniones ni que no las tenga.
    expect(screen.queryByRole('heading', { name: 'Lo que dicen sus clientes' })).toBeNull();
    expect(screen.queryByText('Todavía no tiene opiniones.')).toBeNull();
    espia.mockRestore();
  });

  it('la reputación sigue viniendo del contrato, no de los comentarios', async () => {
    sembrar();
    const espia = vi.spyOn(ratingSource, 'rating_of').mockResolvedValue({
      stars_sum: 18, rating_count: 4, completed_jobs: 6, disputes: 0,
    });
    await conResena('1', 5, 'Muy bueno.');
    montar();

    expect(await screen.findByText('4.5')).toBeTruthy();
    expect(screen.getByText(/4 valoraciones/)).toBeTruthy();
    expect(espia).toHaveBeenCalledWith(PRO);
    espia.mockRestore();
  });

  it('sin valoraciones dice «Nuevo en Masi» aunque haya comentarios', async () => {
    sembrar();
    await conResena('1', 5, 'Muy bueno.');
    montar();

    expect(await screen.findByText('Nuevo en Masi')).toBeTruthy();
    expect(screen.getByText('Muy bueno.')).toBeTruthy();
  });
});
