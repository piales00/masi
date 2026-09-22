import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoProvider } from '../demo/DemoContext';
import { escrow } from '../escrow';
import { solesToStroops } from '../money';
import { leerIncidencia } from '../demo/incidencias';
import { store } from '../demo/store';
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

describe('reportar un problema', () => {
  async function hasta(estado: 'Started' | 'Submitted'): Promise<bigint> {
    const jobId = await crearTrabajo();
    await escrow.accept(jobId);
    await escrow.fund(jobId);
    await escrow.start(jobId);
    if (estado === 'Submitted') await escrow.submit(jobId);
    return jobId;
  }

  it('desde Started, el profesional reporta y el trabajo queda en revisión', async () => {
    const jobId = await hasta('Started');
    montar(jobId, 'provider');

    await userEvent.click(await screen.findByRole('button', { name: 'Tengo un problema' }));
    await userEvent.type(screen.getByRole('textbox'), 'El cliente no me dejó entrar.');
    await userEvent.click(screen.getByRole('button', { name: 'Reportar problema' }));

    await waitFor(async () => {
      expect((await escrow.getJob(jobId)).state.tag).toBe('Disputed');
    });
    expect(await screen.findByRole('heading', { name: 'Problema reportado' })).toBeTruthy();
    expect(leerIncidencia(jobId.toString())?.motivo).toBe('El cliente no me dejó entrar.');
  });

  it('desde Submitted, el cliente también puede reportar', async () => {
    const jobId = await hasta('Submitted');
    montar(jobId, 'client');

    await userEvent.click(await screen.findByRole('button', { name: 'Tengo un problema' }));
    await userEvent.type(screen.getByRole('textbox'), 'El trabajo quedó a medias.');
    await userEvent.click(screen.getByRole('button', { name: 'Reportar problema' }));

    await waitFor(async () => {
      expect((await escrow.getJob(jobId)).state.tag).toBe('Disputed');
    });
    expect(leerIncidencia(jobId.toString())?.reportadaPor).toBe('client');
  });

  it('no se envía sin motivo y se puede cancelar', async () => {
    const jobId = await hasta('Started');
    montar(jobId, 'provider');

    await userEvent.click(await screen.findByRole('button', { name: 'Tengo un problema' }));
    expect(screen.getByRole('button', { name: 'Reportar problema' }).hasAttribute('disabled')).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect((await escrow.getJob(jobId)).state.tag).toBe('Started');
  });

  it('dos clics seguidos reportan una sola vez', async () => {
    const jobId = await hasta('Started');
    const espia = vi.spyOn(escrow, 'dispute');
    montar(jobId, 'provider');

    await userEvent.click(await screen.findByRole('button', { name: 'Tengo un problema' }));
    await userEvent.type(screen.getByRole('textbox'), 'Se rompió una tubería.');
    const enviar = screen.getByRole('button', { name: 'Reportar problema' });
    await Promise.all([userEvent.click(enviar), userEvent.click(enviar)]);

    await waitFor(async () => expect((await escrow.getJob(jobId)).state.tag).toBe('Disputed'));
    expect(espia).toHaveBeenCalledTimes(1);
    espia.mockRestore();
  });

  it('un fallo del contrato se muestra traducido', async () => {
    const jobId = await hasta('Started');
    const espia = vi.spyOn(escrow, 'dispute').mockRejectedValueOnce(new Error('HostError: Error(Contract, #5)'));
    montar(jobId, 'provider');

    await userEvent.click(await screen.findByRole('button', { name: 'Tengo un problema' }));
    await userEvent.type(screen.getByRole('textbox'), 'Algo pasó.');
    await userEvent.click(screen.getByRole('button', { name: 'Reportar problema' }));

    expect((await screen.findByRole('alert')).textContent).toBe('No puedes hacer esto en este trabajo.');
    espia.mockRestore();
  });

  it('un trabajo en revisión ya no ofrece reportar ni aprobar', async () => {
    const jobId = await hasta('Submitted');
    await escrow.dispute(jobId, 'cliente-1');
    montar(jobId, 'client');

    expect(await screen.findByRole('heading', { name: 'Problema reportado' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aprobar servicio' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tengo un problema' })).toBeNull();
  });
});

describe('reseña con comentario', () => {
  /** Un trabajo Released con su cotización, que es de donde salen providerId y dirección. */
  async function conCotizacion(): Promise<bigint> {
    const jobId = await crearTrabajo();
    await escrow.accept(jobId);
    await escrow.fund(jobId);
    await escrow.start(jobId);
    await escrow.submit(jobId);
    await escrow.approve(jobId);
    localStorage.setItem('masi.demo.cotizaciones.v1', JSON.stringify([{
      id: 'c1', solicitudId: 's1', postulacionId: 'p1', providerId: 'juan', providerAddress: PROFESIONAL,
      clienteId: CLIENTE, totalStroops: '12000000000', materialesStroops: '3600000000',
      materialsBps: 3000, feeBps: 500, reviewSecs: 86400, descripcion: 'x', estado: 'aceptada',
      jobId: jobId.toString(), txHash: 'abc', creadaEn: new Date().toISOString(), actualizadaEn: new Date().toISOString(),
    }]));
    return jobId;
  }

  it('guarda estrellas y comentario, y deja leerlo después', async () => {
    const jobId = await conCotizacion();
    montar(jobId, 'client');

    await userEvent.click(await screen.findByRole('radio', { name: '5 estrellas' }));
    await userEvent.type(screen.getByRole('textbox'), 'Llegó puntual y dejó todo limpio.');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar calificación' }));

    await waitFor(async () => expect((await escrow.getJob(jobId)).rated).toBe(true));
    const guardada = await store.leerResena(jobId.toString());
    expect(guardada?.texto).toBe('Llegó puntual y dejó todo limpio.');
    expect(guardada?.estrellas).toBe(5);
    expect(guardada?.providerAddress).toBe(PROFESIONAL);
  });

  it('el comentario es opcional: sin texto no se guarda reseña pero sí la calificación', async () => {
    const jobId = await conCotizacion();
    montar(jobId, 'client');

    await userEvent.click(await screen.findByRole('radio', { name: '3 estrellas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar calificación' }));

    await waitFor(async () => expect((await escrow.getJob(jobId)).stars).toBe(3));
    expect(await store.leerResena(jobId.toString())).toBeNull();
  });

  it('si el guardado falla no se califica ni se dice que se guardó', async () => {
    const jobId = await conCotizacion();
    const espiaGuardar = vi.spyOn(store, 'guardarResena').mockRejectedValueOnce(new Error('Algo salió mal. Inténtalo de nuevo.'));
    const espiaRate = vi.spyOn(escrow, 'rate');
    montar(jobId, 'client');

    await userEvent.click(await screen.findByRole('radio', { name: '4 estrellas' }));
    await userEvent.type(screen.getByRole('textbox'), 'No me convenció.');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar calificación' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Algo salió mal. Inténtalo de nuevo.');
    expect(espiaRate).not.toHaveBeenCalled();
    expect((await escrow.getJob(jobId)).rated).toBe(false);
    expect(screen.getByRole('button', { name: 'Enviar calificación' })).toBeTruthy();

    espiaGuardar.mockRestore();
    espiaRate.mockRestore();
  });

  it('una vez calificado no hay segundo envío', async () => {
    const jobId = await conCotizacion();
    montar(jobId, 'client');

    await userEvent.click(await screen.findByRole('radio', { name: '5 estrellas' }));
    await userEvent.type(screen.getByRole('textbox'), 'Muy bien.');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar calificación' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Enviar calificación' })).toBeNull());
    expect(await screen.findByText('Tu calificación')).toBeTruthy();
  });

  it('sin cotización no se ofrece el comentario, solo las estrellas', async () => {
    const jobId = await crearTrabajo();
    await escrow.accept(jobId);
    await escrow.fund(jobId);
    await escrow.start(jobId);
    await escrow.submit(jobId);
    await escrow.approve(jobId);
    montar(jobId, 'client');

    expect(await screen.findByRole('button', { name: 'Enviar calificación' })).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
