import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Job } from '../../../shared/escrow';

/**
 * Los cuatro trabajos son los que hay de verdad en testnet el 23/09: tres cerrados y el
 * #4 en disputa con S/180 congelados. Solo ese debe aparecer en el panel.
 */
const getJob = vi.fn();
vi.mock('../escrow', () => ({ escrow: { getJob: (id: bigint) => getJob(id) } }));

const { ArbitrationScreen } = await import('./ArbitrationScreen');

const CLIENTE = 'CDSPVAOAQIYVQWS7JSTTXKRCZLJGSKMZJDCHRI6I2FIJA3NQMIJQL5PP';
const PROFESIONAL = 'CDFL7HNESV2Y4BGOD3VIDCTWLATJLBR5IEBDSUY2QZUZKK5CE2QFFFDQ';

const trabajo = (id: number, tag: string, amount: bigint, materiales: bigint, restante: bigint, descripcion: string): Job => ({
  id: BigInt(id),
  client: CLIENTE,
  provider: PROFESIONAL,
  amount,
  materials_amount: materiales,
  remaining_amount: restante,
  fee_amount: 0n,
  materials_bps: 1000,
  fee_bps: 500,
  review_secs: 86_400n,
  description: descripcion,
  state: { tag, values: undefined },
  created_at: 0n,
  submitted_at: undefined,
  released_at: undefined,
  rated: false,
  stars: 0,
  comment_hash: undefined,
} as unknown as Job);

const REALES: Record<number, Job> = {
  1: trabajo(1, 'Resolved', 12_000_000_000n, 3_600_000_000n, 0n, 'Pintura: cliente disconforme'),
  2: trabajo(2, 'Released', 1_000_000_000n, 200_000_000n, 0n, 'Se malogró mi tele'),
  3: trabajo(3, 'Released', 1_500_000_000n, 300_000_000n, 0n, 'Se malogró mi casa'),
  4: trabajo(4, 'Disputed', 2_000_000_000n, 200_000_000n, 1_800_000_000n, 'Hola'),
};

function sembrarCadena(trabajos: Record<number, Job> = REALES) {
  getJob.mockImplementation(async (id: bigint) => {
    const encontrado = trabajos[Number(id)];
    // A partir del último id el contrato falla: así termina el recorrido.
    if (!encontrado) throw new Error('HostError: Error(Contract, #3)');
    return encontrado;
  });
}

const pintar = () => render(<MemoryRouter><ArbitrationScreen /></MemoryRouter>);

async function entrar(clave = 'clave-del-panel') {
  fireEvent.change(screen.getByLabelText('Clave'), { target: { value: clave } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await waitFor(() => expect(getJob).toHaveBeenCalled());
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); getJob.mockReset(); });

describe('puerta del panel', () => {
  it('no lee la cadena hasta que se escribe la clave', () => {
    sembrarCadena();
    pintar();
    expect(screen.getByLabelText('Clave')).toBeTruthy();
    expect(getJob).not.toHaveBeenCalled();
  });

  it('sin clave no deja entrar', () => {
    sembrarCadena();
    pintar();
    expect((screen.getByRole('button', { name: 'Entrar' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('lista de disputas', () => {
  it('muestra solo el trabajo en disputa, no los cerrados', async () => {
    sembrarCadena();
    pintar();
    await entrar();

    expect(await screen.findByText('Trabajo #4')).toBeTruthy();
    for (const cerrado of ['Trabajo #1', 'Trabajo #2', 'Trabajo #3']) {
      expect(screen.queryByText(cerrado)).toBeNull();
    }
  });

  it('recorre los ids en paralelo con un tope de 50', async () => {
    sembrarCadena();
    pintar();
    await entrar();
    await screen.findByText('Trabajo #4');
    expect(getJob).toHaveBeenCalledTimes(50);
    expect(getJob.mock.calls[0][0]).toBe(1n);
  });

  it('enseña los montos reales en soles', async () => {
    sembrarCadena();
    pintar();
    await entrar();
    await screen.findByText('Trabajo #4');

    expect(screen.getByText('S/ 200')).toBeTruthy();   // total
    expect(screen.getByText('S/ 20')).toBeTruthy();    // adelanto ya entregado
    expect(screen.getByText('S/ 180')).toBeTruthy();   // saldo en disputa
  });

  it('dice que el adelanto de materiales no se reparte', async () => {
    sembrarCadena();
    pintar();
    await entrar();
    expect(await screen.findByText(/adelanto de\s+materiales ya es del profesional/)).toBeTruthy();
  });

  it('sin disputas abiertas lo dice y no inventa una lista', async () => {
    sembrarCadena({ 1: REALES[1], 2: REALES[2] });
    pintar();
    await entrar();
    expect(await screen.findByText('No hay disputas abiertas')).toBeTruthy();
  });
});

describe('reparto', () => {
  it('calcula en vivo los dos lados al mover el deslizador', async () => {
    sembrarCadena();
    pintar();
    await entrar();
    await screen.findByText('Trabajo #4');

    // 50 % por defecto sobre S/180.
    expect(screen.getByText('Al profesional S/ 90')).toBeTruthy();
    expect(screen.getByText('Al cliente S/ 90')).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Para el profesional/), { target: { value: '70' } });
    expect(screen.getByText('Al profesional S/ 126')).toBeTruthy();
    expect(screen.getByText('Al cliente S/ 54')).toBeTruthy();
  });
});

describe('resolver', () => {
  it('pide confirmación repitiendo el reparto antes de firmar', async () => {
    sembrarCadena();
    const fetchImpl = vi.fn();
    vi.stubGlobal('fetch', fetchImpl);
    pintar();
    await entrar();
    await screen.findByText('Trabajo #4');

    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }));
    expect(screen.getByText(/Vas a repartir/)).toBeTruthy();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('firma con la clave en la cabecera y el reparto elegido', async () => {
    sembrarCadena();
    const fetchImpl = vi.fn(async (_ruta: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ hash: 'abc123' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchImpl);
    pintar();
    await entrar('mi-clave');
    await screen.findByText('Trabajo #4');

    fireEvent.change(screen.getByLabelText(/Para el profesional/), { target: { value: '70' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, resolver' }));

    await waitFor(() => expect(fetchImpl).toHaveBeenCalled());
    const [ruta, init] = fetchImpl.mock.calls[0];
    expect(ruta).toBe('/api/arbitraje');
    expect((init?.headers as Record<string, string>)['x-masi-arbitraje']).toBe('mi-clave');
    expect(JSON.parse(String(init?.body))).toEqual({ jobId: '4', providerBps: 7000 });
  });

  it('tras resolver lo da por cerrado con su reparto', async () => {
    sembrarCadena();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ hash: 'abc123' }), { status: 200 })));
    pintar();
    await entrar();
    await screen.findByText('Trabajo #4');

    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, resolver' }));
    expect(await screen.findByText('Trabajo #4 resuelto')).toBeTruthy();
  });

  it('con la clave equivocada enseña el 401 y deja reintentar', async () => {
    sembrarCadena();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: { code: 'NOT_ALLOWED', message: 'No autorizado.' } }), { status: 401 },
    )));
    pintar();
    await entrar();
    await screen.findByText('Trabajo #4');

    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, resolver' }));

    expect((await screen.findByRole('alert')).textContent).toContain('No autorizado.');
    expect(screen.getByRole('button', { name: 'Resolver' })).toBeTruthy();
  });
});
