import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoProvider } from '../demo/DemoContext';
import { escrow } from '../escrow';
import { solesToStroops } from '../money';
import { JobScreen } from './JobScreen';
import type { JobRole } from '../escrow/jobs';

const CLIENTE = 'cliente-1';
const PROFESIONAL = 'profesional-1';

async function crearTrabajo(): Promise<bigint> {
  const { jobId } = await escrow.createJob({
    client: CLIENTE,
    provider: PROFESIONAL,
    amount: solesToStroops('1200'),
    materials_bps: 3000,
    fee_bps: 500,
    review_secs: 86400n,
    description: 'Pintar la sala',
  });
  return jobId;
}

function montar(jobId: bigint, role: JobRole) {
  return render(<DemoProvider>
    <MemoryRouter initialEntries={[`/t/${jobId}`]}>
      <Routes><Route path="/t/:jobId" element={<JobScreen role={role} />} /></Routes>
    </MemoryRouter>
  </DemoProvider>);
}

/** Monta, espera a que cargue y pulsa el botón indicado. */
async function pulsar(jobId: bigint, role: JobRole, texto: string) {
  montar(jobId, role);
  const boton = await screen.findByRole('button', { name: texto });
  await userEvent.click(boton);
  await waitFor(() => expect(screen.queryByRole('button', { name: texto })).toBeNull());
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('camino feliz desde la pantalla', () => {
  it('recorre los cinco pasos alternando rol y persiste cada uno', async () => {
    const jobId = await crearTrabajo();

    await pulsar(jobId, 'provider', 'Confirmar trabajo');
    expect((await escrow.getJob(jobId)).state.tag).toBe('Accepted');
    cleanup();

    await pulsar(jobId, 'client', 'Realizar pago protegido');
    expect((await escrow.getJob(jobId)).state.tag).toBe('Funded');
    cleanup();

    await pulsar(jobId, 'provider', 'Iniciar servicio');
    expect((await escrow.getJob(jobId)).state.tag).toBe('Started');
    cleanup();

    await pulsar(jobId, 'provider', 'Marcar como terminado');
    expect((await escrow.getJob(jobId)).state.tag).toBe('Submitted');
    cleanup();

    await pulsar(jobId, 'client', 'Aprobar servicio');
    expect((await escrow.getJob(jobId)).state.tag).toBe('Released');
  });

  it('el estado sobrevive a volver a montar la pantalla', async () => {
    const jobId = await crearTrabajo();
    await pulsar(jobId, 'provider', 'Confirmar trabajo');
    cleanup();

    // Equivale a recargar: la pantalla vuelve a leer del gateway, no de React.
    montar(jobId, 'provider');
    expect(await screen.findByRole('heading', { name: 'Trabajo confirmado' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Confirmar trabajo' })).toBeNull();
  });

  it('cada rol solo ve su propia acción', async () => {
    const jobId = await crearTrabajo();
    montar(jobId, 'client');
    expect(await screen.findByRole('heading', { name: 'Cotización aceptada' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Confirmar trabajo' })).toBeNull();
  });
});

describe('doble clic y errores', () => {
  it('dos clics seguidos ejecutan la acción una sola vez', async () => {
    const jobId = await crearTrabajo();
    const espia = vi.spyOn(escrow, 'accept');
    montar(jobId, 'provider');

    const boton = await screen.findByRole('button', { name: 'Confirmar trabajo' });
    await Promise.all([userEvent.click(boton), userEvent.click(boton), userEvent.click(boton)]);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Confirmar trabajo' })).toBeNull());

    expect(espia).toHaveBeenCalledTimes(1);
    expect((await escrow.getJob(jobId)).state.tag).toBe('Accepted');
    espia.mockRestore();
  });

  it('un fallo del contrato se muestra traducido y deja reintentar', async () => {
    const jobId = await crearTrabajo();
    const espia = vi.spyOn(escrow, 'accept').mockRejectedValueOnce(new Error('HostError: Error(Contract, #4)'));
    montar(jobId, 'provider');

    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar trabajo' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Este trabajo ya avanzó. Actualiza la página.');
    expect(screen.getByRole('button', { name: 'Confirmar trabajo' })).toBeTruthy();

    espia.mockRestore();
  });

  it('un trabajo que no existe no rompe la pantalla', async () => {
    montar(4242n, 'client');
    expect(await screen.findByText('No encontramos ese trabajo.')).toBeTruthy();
  });
});

describe('liberación automática', () => {
  it('al abrir un trabajo con el plazo vencido, el pago se libera sin pedir nada', async () => {
    // 910 es el trabajo de muestra cuyo plazo ya venció.
    await escrow.getJob(910n);
    montar(910n, 'provider');

    await waitFor(async () => {
      expect((await escrow.getJob(910n)).state.tag).toBe('Released');
    });
    expect(screen.queryByRole('button', { name: /cobrar/i })).toBeNull();
  });

  it('dentro del plazo no libera nada y anuncia hasta cuándo', async () => {
    await escrow.getJob(905n);
    montar(905n, 'client');

    expect(await screen.findByRole('heading', { name: 'Trabajo terminado' })).toBeTruthy();
    expect(screen.getByText(/Puedes revisar el trabajo hasta/)).toBeTruthy();
    expect((await escrow.getJob(905n)).state.tag).toBe('Submitted');
  });
});

describe('calificación', () => {
  async function hastaReleased(): Promise<bigint> {
    const jobId = await crearTrabajo();
    await escrow.accept(jobId);
    await escrow.fund(jobId);
    await escrow.start(jobId);
    await escrow.submit(jobId);
    await escrow.approve(jobId);
    return jobId;
  }

  it('el cliente califica con estrellas y queda guardada', async () => {
    const jobId = await hastaReleased();
    montar(jobId, 'client');

    await userEvent.click(await screen.findByRole('radio', { name: '4 estrellas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar calificación' }));

    await waitFor(async () => {
      const job = await escrow.getJob(jobId);
      expect(job.rated).toBe(true);
      expect(job.stars).toBe(4);
    });
  });

  it('no se puede calificar dos veces', async () => {
    const jobId = await hastaReleased();
    await escrow.rate(jobId, 5, new Uint8Array(32));
    montar(jobId, 'client');

    expect(await screen.findByText('Tu calificación')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Enviar calificación' })).toBeNull();
  });

  it('sin estrellas no deja enviar', async () => {
    const jobId = await hastaReleased();
    montar(jobId, 'client');
    expect((await screen.findByRole('button', { name: 'Enviar calificación' })).hasAttribute('disabled')).toBe(true);
  });

  it('el profesional no califica', async () => {
    const jobId = await hastaReleased();
    montar(jobId, 'provider');
    expect(await screen.findByRole('heading', { name: 'Servicio completado' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Enviar calificación' })).toBeNull();
  });
});
