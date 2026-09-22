import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DemoProvider } from '../demo/DemoContext';
import { escrow } from '../escrow';
import { solesToStroops } from '../money';
import { ProviderActivityScreen } from './ProviderActivityScreen';
import { RequestsScreen } from './RequestsScreen';

const CLIENTE = 'cliente-1';
const JUAN = 'CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526';
const iso = new Date().toISOString();

const solicitud = (id: string, estado: string, extra: Record<string, unknown> = {}) => ({
  id, servicio: 'Pintura', descripcion: `Trabajo ${id}`, fotos: [], ubicacion: 'Av. 1',
  distrito: 'Chorrillos', cuando: 'Hoy', cliente: 'Samuel Ortega', clienteId: CLIENTE,
  estado, creadaEn: iso, ...extra,
});

const postulacion = (id: string, solicitudId: string) => ({
  id, solicitudId, providerId: 'juan', providerNombre: 'Juan Ramírez',
  providerAddress: JUAN, precio: 1200, minutos: 40, fecha: iso,
});

const cotizacion = (solicitudId: string, postulacionId: string, jobId: string) => ({
  id: `c-${solicitudId}`, solicitudId, postulacionId, providerId: 'juan', providerAddress: JUAN,
  clienteId: CLIENTE, totalStroops: '12000000000', materialesStroops: '3600000000',
  materialsBps: 3000, feeBps: 500, reviewSecs: 86400, descripcion: 'x',
  estado: 'aceptada', jobId, txHash: 'abc', creadaEn: iso, actualizadaEn: iso,
});

function sembrar(solicitudes: unknown[], postulaciones: unknown[], cotizaciones: unknown[]) {
  localStorage.setItem('masi.demo.clienteId.v1', JSON.stringify(CLIENTE));
  localStorage.setItem('masi.demo.cliente.v2', JSON.stringify({ firstName: 'Samuel', lastName: 'Ortega', phone: '9', district: 'Chorrillos' }));
  localStorage.setItem('masi.demo.profesional.v2', JSON.stringify({ id: 'juan', fullName: 'Juan Ramírez', services: ['Pintura'], district: 'Surco', yearsExperience: 8, bio: '' }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: true, provider: true }));
  localStorage.setItem('masi.demo.solicitudes.v1', JSON.stringify(solicitudes));
  localStorage.setItem('masi.demo.postulaciones.v1', JSON.stringify(postulaciones));
  localStorage.setItem('masi.demo.cotizaciones.v1', JSON.stringify(cotizaciones));
}

/** Crea un trabajo real en el gateway y lo deja en el estado pedido. */
async function trabajoEn(pasos: ('accept' | 'fund' | 'start' | 'submit' | 'approve')[]): Promise<string> {
  const { jobId } = await escrow.createJob({
    client: CLIENTE, provider: JUAN, amount: solesToStroops('1200'),
    materials_bps: 3000, fee_bps: 500, review_secs: 86400n, description: 'Pintar la sala',
  });
  for (const paso of pasos) await escrow[paso](jobId);
  return jobId.toString();
}

const montarCliente = () => render(<DemoProvider><MemoryRouter><RequestsScreen /></MemoryRouter></DemoProvider>);
const montarProfesional = () => render(<DemoProvider><MemoryRouter><ProviderActivityScreen /></MemoryRouter></DemoProvider>);

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Solicitudes del cliente', () => {
  it('reparte cada solicitud en su grupo, sin duplicar ninguna', async () => {
    const enCurso = await trabajoEn(['accept', 'fund']);
    sembrar(
      [
        solicitud('s1', 'buscando_profesionales'),
        solicitud('s2', 'profesional_elegido', { postulacionElegidaId: 'p2' }),
        solicitud('s3', 'contratada', { postulacionElegidaId: 'p3' }),
      ],
      [postulacion('p2', 's2'), postulacion('p3', 's3')],
      [cotizacion('s3', 'p3', enCurso)],
    );
    montarCliente();

    expect(await screen.findByRole('heading', { name: 'Servicios en curso' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Buscando profesional' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Coordinando el servicio' })).toBeTruthy();

    // Cada descripción aparece una sola vez en toda la pantalla.
    for (const id of ['s1', 's2', 's3']) {
      expect(screen.getAllByText(`Trabajo ${id}`)).toHaveLength(1);
    }
  });

  it('los grupos vacíos no se dibujan', async () => {
    sembrar([solicitud('s1', 'profesional_elegido', { postulacionElegidaId: 'p1' })], [postulacion('p1', 's1')], []);
    montarCliente();

    expect(await screen.findByRole('heading', { name: 'Coordinando el servicio' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Buscando profesional' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Servicios en curso' })).toBeNull();
  });

  it('Requested y Accepted se quedan en coordinación', async () => {
    const jobId = await trabajoEn(['accept']);
    sembrar([solicitud('s1', 'contratada', { postulacionElegidaId: 'p1' })], [postulacion('p1', 's1')], [cotizacion('s1', 'p1', jobId)]);
    montarCliente();

    expect(await screen.findByRole('heading', { name: 'Coordinando el servicio' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Servicios en curso' })).toBeNull();
    // Y la tarjeta invita a la acción que toca, no a un genérico.
    expect(screen.getByText('Realizar pago protegido')).toBeTruthy();
  });

  it('un servicio terminado desaparece de Solicitudes', async () => {
    const jobId = await trabajoEn(['accept', 'fund', 'start', 'submit', 'approve']);
    sembrar([solicitud('s1', 'contratada', { postulacionElegidaId: 'p1' })], [postulacion('p1', 's1')], [cotizacion('s1', 'p1', jobId)]);
    montarCliente();

    await waitFor(() => {
      expect(screen.queryByText('Trabajo s1')).toBeNull();
    });
    expect(screen.queryByRole('heading', { name: 'Servicios en curso' })).toBeNull();
    expect(screen.getByText(/Aquí verás las solicitudes que publiques/)).toBeTruthy();
  });
});

describe('Solicitudes del profesional', () => {
  it('un servicio terminado sale de Trabajos en proceso', async () => {
    const jobId = await trabajoEn(['accept', 'fund', 'start', 'submit', 'approve']);
    sembrar([solicitud('s1', 'contratada', { postulacionElegidaId: 'p1' })], [postulacion('p1', 's1')], [cotizacion('s1', 'p1', jobId)]);
    montarProfesional();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Continuar trabajo' })).toBeNull();
    });
    expect(screen.queryByRole('heading', { name: 'Trabajos en proceso' })).toBeNull();
    // Y no reaparece como si fuera una oportunidad.
    expect(screen.queryByRole('heading', { name: 'Solicitudes de clientes' })).toBeNull();
  });

  it('un servicio activo sí sigue en Trabajos en proceso', async () => {
    const jobId = await trabajoEn(['accept', 'fund']);
    sembrar([solicitud('s1', 'contratada', { postulacionElegidaId: 'p1' })], [postulacion('p1', 's1')], [cotizacion('s1', 'p1', jobId)]);
    montarProfesional();

    expect(await screen.findByRole('heading', { name: 'Trabajos en proceso' })).toBeTruthy();
    expect(screen.getByText('Servicios activos con tus clientes.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continuar trabajo' })).toBeTruthy();
  });
});
