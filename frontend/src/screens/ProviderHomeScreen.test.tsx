import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DemoProvider } from '../demo/DemoContext';
import { escrow } from '../escrow';
import { solesToStroops } from '../money';
import { ProviderHomeScreen } from './ProviderHomeScreen';
import { ratingSource } from '../dataSource';

const CLIENTE = 'cliente-1';
/**
 * Una dirección que NO está en el catálogo ni en los fixtures de calificaciones: es un
 * profesional registrado en la app, que es justo el caso que hay que probar. Con la de
 * Juan del catálogo, `rating_of` devolvería su nota de ejemplo y el test mentiría.
 */
const NUEVO = 'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K';

/** Sesión de un profesional con dirección propia y sin nada más. */
function sembrarProfesional() {
  localStorage.setItem('masi.demo.profesional.v2', JSON.stringify({
    id: NUEVO, contractId: NUEVO, fullName: 'Ana Quispe',
    services: ['Pintura'], district: 'Surco', yearsExperience: 8, bio: '',
  }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: false, provider: true }));
}

/** Un trabajo suyo llevado hasta el estado pedido con operaciones reales. */
async function trabajo(hasta: 'Released' | 'Resolved' | 'Started', soles = '1200'): Promise<bigint> {
  const { jobId } = await escrow.createJob({
    client: CLIENTE, provider: NUEVO, amount: solesToStroops(soles),
    materials_bps: 3000, fee_bps: 500, review_secs: 86400n, description: 'Pintar la sala',
  });
  await escrow.accept(jobId);
  await escrow.fund(jobId);
  await escrow.start(jobId);
  if (hasta === 'Started') return jobId;
  if (hasta === 'Released') {
    await escrow.submit(jobId);
    await escrow.approve(jobId);
    return jobId;
  }
  await escrow.dispute(jobId, CLIENTE);
  await escrow.resolve(jobId, 6000);
  return jobId;
}

const montar = () => render(<DemoProvider><MemoryRouter><ProviderHomeScreen /></MemoryRouter></DemoProvider>);

/**
 * Deja en el aire las dos lecturas de las que salen las cifras —los trabajos y la
 * reputación— para poder mirar qué se pinta mientras tanto. `responder` las resuelve
 * con lo de verdad.
 */
function cadenaEnSuspenso() {
  const trabajosReales = escrow.jobsOf.bind(escrow);
  const notaReal = ratingSource.rating_of.bind(ratingSource);
  const sueltas: (() => void)[] = [];
  vi.spyOn(escrow, 'jobsOf').mockImplementation(address => new Promise(resolve => {
    sueltas.push(() => { resolve(trabajosReales(address)); });
  }));
  vi.spyOn(ratingSource, 'rating_of').mockImplementation(address => new Promise(resolve => {
    sueltas.push(() => { resolve(notaReal(address)); });
  }));
  return () => { for (const soltar of sueltas) soltar(); };
}

/** Las tres tarjetas de estadísticas, en orden: trabajos, ganado y calificación. */
function estadisticas() {
  return ['Trabajos', 'Ganado', 'Calificación'].map(etiqueta => {
    const label = screen.getByText(etiqueta);
    return label.parentElement?.querySelector('p')?.textContent ?? '';
  });
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('estadísticas del profesional', () => {
  it('un profesional nuevo ve ceros, no cifras de ejemplo', async () => {
    sembrarProfesional();
    montar();

    await waitFor(() => expect(estadisticas()).toEqual(['0', 'S/ 0', 'Nuevo en Masi']));
    // Las cifras de ejemplo que había antes no pueden volver a aparecer.
    expect(screen.queryByText('S/ 940')).toBeNull();
    expect(screen.queryByText('24 trabajos')).toBeNull();
    expect(screen.queryByText('4.8')).toBeNull();
  });

  it('cuenta los trabajos completados y suma lo que cobró', async () => {
    await trabajo('Released', '1200');
    await trabajo('Released', '800');
    sembrarProfesional();
    montar();

    await waitFor(() => expect(estadisticas()[0]).toBe('2'));
    expect(estadisticas()[1]).toBe('S/ 2,000');
    expect(await screen.findByText('· 2 trabajos')).toBeTruthy();
  });

  it('un trabajo en curso todavía no cuenta ni paga', async () => {
    await trabajo('Started');
    sembrarProfesional();
    montar();

    await waitFor(() => expect(estadisticas()).toEqual(['0', 'S/ 0', 'Nuevo en Masi']));
  });

  it('un caso resuelto no inventa ingresos', async () => {
    // El reparto del árbitro no está en el Job, así que no se puede saber cuánto cobró.
    await trabajo('Resolved');
    sembrarProfesional();
    montar();

    await waitFor(() => expect(estadisticas()).toEqual(['0', 'S/ 0', 'Nuevo en Masi']));
  });

  it('los trabajos de otro profesional no se suman a los suyos', async () => {
    const { jobId } = await escrow.createJob({
      client: CLIENTE, provider: 'otro-profesional', amount: solesToStroops('5000'),
      materials_bps: 3000, fee_bps: 500, review_secs: 86400n, description: 'De otro',
    });
    await escrow.accept(jobId);
    await escrow.fund(jobId);
    await escrow.start(jobId);
    await escrow.submit(jobId);
    await escrow.approve(jobId);

    sembrarProfesional();
    montar();
    await waitFor(() => expect(estadisticas()).toEqual(['0', 'S/ 0', 'Nuevo en Masi']));
  });
});

describe('reputación en el Inicio', () => {
  it('muestra su calificación real cuando el contrato la tiene', async () => {
    const espia = vi.spyOn(ratingSource, 'rating_of').mockResolvedValue({
      stars_sum: 18, rating_count: 4, completed_jobs: 6, disputes: 0,
    });
    sembrarProfesional();
    montar();

    await waitFor(() => expect(estadisticas()[2]).toBe('4.5'));
    expect(espia).toHaveBeenCalledWith(NUEVO);
    espia.mockRestore();
  });

  it('sin valoraciones dice «Nuevo en Masi», nunca un cero', async () => {
    const espia = vi.spyOn(ratingSource, 'rating_of').mockResolvedValue({
      stars_sum: 0, rating_count: 0, completed_jobs: 0, disputes: 0,
    });
    sembrarProfesional();
    montar();

    await waitFor(() => expect(estadisticas()[2]).toBe('Nuevo en Masi'));
    expect(estadisticas()[2]).not.toContain('0.0');
    espia.mockRestore();
  });
});

describe('volver al Inicio no lo hace parecer nuevo', () => {
  it('mientras no se sabe, ni «Nuevo en Masi» ni ceros', async () => {
    await trabajo('Released', '1200');
    sembrarProfesional();
    const responder = cadenaEnSuspenso();
    montar();

    // Primer pintado: las lecturas siguen en vuelo, así que no se afirma nada.
    expect(screen.queryByText('Nuevo en Masi')).toBeNull();
    expect(screen.queryByText('S/ 0')).toBeNull();
    expect(screen.queryByText('· 0 trabajos')).toBeNull();

    responder();

    await waitFor(() => expect(estadisticas()).toEqual(['1', 'S/ 1,200', 'Nuevo en Masi']));
  });

  it('al volver a la pantalla tampoco parpadea el estado de recién llegado', async () => {
    await trabajo('Released', '1200');
    sembrarProfesional();
    const primera = montar();
    await waitFor(() => expect(estadisticas()[0]).toBe('1'));

    // Se va a otra sección y vuelve: la pantalla se monta de nuevo y relee.
    primera.unmount();
    cleanup();
    const responder = cadenaEnSuspenso();
    montar();

    expect(screen.queryByText('Nuevo en Masi')).toBeNull();
    expect(screen.queryByText('· 0 trabajos')).toBeNull();

    responder();
    await waitFor(() => expect(estadisticas()[0]).toBe('1'));
  });
});
