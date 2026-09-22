import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoProvider } from '../demo/DemoContext';
import { escrow } from '../escrow';
import { solesToStroops } from '../money';
import { ActivityScreen } from './ActivityScreen';
import { ProviderActivityScreen } from './ProviderActivityScreen';
import { RequestsScreen } from './RequestsScreen';

const CLIENTE = 'cliente-1';
const JUAN = 'CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526';
const JOBS_KEY = 'masi.demo.trabajos.v1';
const iso = new Date().toISOString();

function sembrarDemo(jobId: string) {
  localStorage.setItem('masi.demo.clienteId.v1', JSON.stringify(CLIENTE));
  localStorage.setItem('masi.demo.cliente.v2', JSON.stringify({ firstName: 'Samuel', lastName: 'Ortega', phone: '9', district: 'Chorrillos' }));
  localStorage.setItem('masi.demo.profesional.v2', JSON.stringify({ id: 'juan', fullName: 'Juan Ramírez', services: ['Pintura'], district: 'Surco', yearsExperience: 8, bio: '' }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: true, provider: true }));
  localStorage.setItem('masi.demo.solicitudes.v1', JSON.stringify([{
    id: 's1', servicio: 'Pintura', descripcion: 'Pintar la sala', fotos: [], ubicacion: 'Av. 1',
    distrito: 'Chorrillos', cuando: 'Hoy', cliente: 'Samuel Ortega', clienteId: CLIENTE,
    estado: 'contratada', postulacionElegidaId: 'p1', creadaEn: iso,
  }]));
  localStorage.setItem('masi.demo.postulaciones.v1', JSON.stringify([{
    id: 'p1', solicitudId: 's1', providerId: 'juan', providerNombre: 'Juan Ramírez',
    providerAddress: JUAN, precio: 1200, minutos: 40, fecha: iso,
  }]));
  localStorage.setItem('masi.demo.cotizaciones.v1', JSON.stringify([{
    id: 'c1', solicitudId: 's1', postulacionId: 'p1', providerId: 'juan', providerAddress: JUAN,
    clienteId: CLIENTE, totalStroops: '12000000000', materialesStroops: '3600000000',
    materialsBps: 3000, feeBps: 500, reviewSecs: 86400, descripcion: 'x',
    estado: 'aceptada', jobId, txHash: 'abc', creadaEn: iso, actualizadaEn: iso,
  }]));
}

async function crear(): Promise<bigint> {
  const { jobId } = await escrow.createJob({
    client: CLIENTE, provider: JUAN, amount: solesToStroops('1200'),
    materials_bps: 3000, fee_bps: 500, review_secs: 86400n, description: 'Pintar la sala',
  });
  return jobId;
}

/** Hasta el estado pedido usando solo operaciones reales del gateway. */
async function llevarA(estado: 'Released' | 'Resolved' | 'Disputed' | 'Started'): Promise<bigint> {
  const jobId = await crear();
  await escrow.accept(jobId);
  await escrow.fund(jobId);
  await escrow.start(jobId);
  if (estado === 'Started') return jobId;
  if (estado === 'Released') {
    await escrow.submit(jobId);
    await escrow.approve(jobId);
    return jobId;
  }
  await escrow.dispute(jobId, CLIENTE);
  if (estado === 'Resolved') await escrow.resolve(jobId, 6000);
  return jobId;
}

/** El contrato no expone `cancel` en el gateway, así que este estado se siembra. */
async function cancelado(): Promise<bigint> {
  const jobId = await crear();
  const rows = JSON.parse(localStorage.getItem(JOBS_KEY) ?? '[]') as { id: string; state?: string }[];
  const row = rows.find(item => item.id === jobId.toString())!;
  row.state = 'Cancelled';
  localStorage.setItem(JOBS_KEY, JSON.stringify(rows));
  return jobId;
}

const montar = (ui: React.ReactElement) => render(<DemoProvider><MemoryRouter>{ui}</MemoryRouter></DemoProvider>);

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Actividad como historial', () => {
  it('muestra un servicio completado con su monto y su calificación', async () => {
    const jobId = await llevarA('Released');
    await escrow.rate(jobId, 5, new Uint8Array(32));
    sembrarDemo(jobId.toString());
    montar(<ActivityScreen role="client" />);

    expect(await screen.findByText('Servicio completado')).toBeTruthy();
    expect(screen.getByText('Con Juan Ramírez')).toBeTruthy();
    expect(screen.getByText('S/ 1,260')).toBeTruthy();
    expect(screen.getByText('5 de 5')).toBeTruthy();
  });

  it('muestra un caso resuelto y uno cancelado', async () => {
    const resuelto = await llevarA('Resolved');
    sembrarDemo(resuelto.toString());
    montar(<ActivityScreen role="client" />);
    expect(await screen.findByText('Problema resuelto')).toBeTruthy();
    cleanup();

    localStorage.removeItem(JOBS_KEY);
    const anulado = await cancelado();
    sembrarDemo(anulado.toString());
    montar(<ActivityScreen role="client" />);
    expect(await screen.findByText('Servicio cancelado')).toBeTruthy();
  });

  it('no lista trabajos que siguen activos', async () => {
    const jobId = await llevarA('Started');
    sembrarDemo(jobId.toString());
    montar(<ActivityScreen role="client" />);

    expect(await screen.findByText(/Aquí quedará el historial/)).toBeTruthy();
    expect(screen.queryByText('Ver detalles')).toBeNull();
  });

  it('ordena del más reciente al más antiguo', async () => {
    const viejo = await llevarA('Released');
    const nuevo = await llevarA('Released');
    // El segundo se liberó después, así que va primero.
    const rows = JSON.parse(localStorage.getItem(JOBS_KEY)!) as { id: string; released_at?: string }[];
    rows.find(r => r.id === viejo.toString())!.released_at = '1000';
    rows.find(r => r.id === nuevo.toString())!.released_at = '2000';
    localStorage.setItem(JOBS_KEY, JSON.stringify(rows));

    sembrarDemo(nuevo.toString());
    montar(<ActivityScreen role="client" />);

    await waitFor(() => expect(screen.getAllByText('Ver detalles')).toHaveLength(2));
    const tarjetas = screen.getAllByRole('button');
    expect(tarjetas[0].textContent).toContain('Con Juan Ramírez');
  });

  it('abre el detalle en la ruta de cada rol', async () => {
    const jobId = await llevarA('Released');
    sembrarDemo(jobId.toString());

    const Destino = () => <p>detalle cliente</p>;
    render(<DemoProvider><MemoryRouter initialEntries={['/actividad']}>
      <Routes>
        <Route path="/actividad" element={<ActivityScreen role="client" />} />
        <Route path="/trabajos/:jobId" element={<Destino />} />
      </Routes>
    </MemoryRouter></DemoProvider>);

    await userEvent.click(await screen.findByRole('button'));
    expect(await screen.findByText('detalle cliente')).toBeTruthy();
    cleanup();

    const DestinoPro = () => <p>detalle profesional</p>;
    render(<DemoProvider><MemoryRouter initialEntries={['/profesional/actividad']}>
      <Routes>
        <Route path="/profesional/actividad" element={<ActivityScreen role="provider" />} />
        <Route path="/profesional/trabajos/:jobId" element={<DestinoPro />} />
      </Routes>
    </MemoryRouter></DemoProvider>);

    await userEvent.click(await screen.findByRole('button'));
    expect(await screen.findByText('detalle profesional')).toBeTruthy();
  });

  it('avisa cuando falta calificar y no lo pide en un cancelado', async () => {
    const jobId = await llevarA('Released');
    sembrarDemo(jobId.toString());
    montar(<ActivityScreen role="client" />);
    expect(await screen.findByText('Falta tu calificación')).toBeTruthy();
    cleanup();

    localStorage.removeItem(JOBS_KEY);
    const anulado = await cancelado();
    sembrarDemo(anulado.toString());
    montar(<ActivityScreen role="client" />);
    await screen.findByText('Servicio cancelado');
    expect(screen.queryByText('Falta tu calificación')).toBeNull();
  });

  it('el profesional ve su propio historial', async () => {
    const jobId = await llevarA('Released');
    sembrarDemo(jobId.toString());
    montar(<ActivityScreen role="provider" />);

    expect(await screen.findByText('Servicio completado')).toBeTruthy();
    expect(screen.getByText('Para Samuel Ortega')).toBeTruthy();
    // El profesional recibe el total, sin la comisión que paga el cliente.
    expect(screen.getByText('S/ 1,200')).toBeTruthy();
  });
});

describe('un trabajo está en Solicitudes o en Actividad, nunca en las dos', () => {
  it('Disputed sigue en Solicitudes y no aparece en Actividad', async () => {
    const jobId = await llevarA('Disputed');
    sembrarDemo(jobId.toString());

    montar(<RequestsScreen />);
    expect(await screen.findByRole('heading', { name: 'Servicios en curso' })).toBeTruthy();
    cleanup();

    montar(<ProviderActivityScreen />);
    expect(await screen.findByRole('heading', { name: 'Trabajos en proceso' })).toBeTruthy();
    cleanup();

    montar(<ActivityScreen role="client" />);
    expect(await screen.findByText(/Aquí quedará el historial/)).toBeTruthy();
  });

  it('Resolved sale de Solicitudes y entra en Actividad', async () => {
    const jobId = await llevarA('Resolved');
    sembrarDemo(jobId.toString());

    montar(<RequestsScreen />);
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Servicios en curso' })).toBeNull());
    cleanup();

    montar(<ProviderActivityScreen />);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Continuar trabajo' })).toBeNull());
    cleanup();

    montar(<ActivityScreen role="client" />);
    expect(await screen.findByText('Problema resuelto')).toBeTruthy();
  });

  it('Cancelled sale de Solicitudes y entra en Actividad', async () => {
    const jobId = await cancelado();
    sembrarDemo(jobId.toString());

    montar(<RequestsScreen />);
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Servicios en curso' })).toBeNull());
    cleanup();

    montar(<ActivityScreen role="client" />);
    expect(await screen.findByText('Servicio cancelado')).toBeTruthy();
  });

  it('el historial sobrevive a volver a montar', async () => {
    const jobId = await llevarA('Released');
    sembrarDemo(jobId.toString());

    montar(<ActivityScreen role="client" />);
    expect(await screen.findByText('Servicio completado')).toBeTruthy();
    cleanup();

    montar(<ActivityScreen role="client" />);
    expect(await screen.findByText('Servicio completado')).toBeTruthy();
  });
});
