import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequestDetailScreen } from './RequestDetailScreen';
import { confirmDemoIdentity } from '../passkeys';
import { escrow } from '../escrow';

const state = vi.hoisted(() => ({ acceptQuote: vi.fn(), pending: null as null | { cotizacionId: string; jobId: string; txHash: string } }));
vi.mock('../passkeys', () => ({ confirmDemoIdentity: vi.fn() }));
vi.mock('../escrow', () => ({ escrow: { createJob: vi.fn() } }));
vi.mock('../useMarketplace', () => ({ useMarketplace: () => ({ status: 'ready', items: [] }) }));
vi.mock('../demo/DemoContext', () => ({
  readPendingAcceptance: () => state.pending,
  writePendingAcceptance: (value: typeof state.pending) => { state.pending = value; },
  useDemo: () => ({
    clienteId: 'C_CLIENT', profile: { contractId: 'C_CLIENT' },
    solicitudes: [{ id: 's1', clienteId: 'C_CLIENT', servicio: 'Pintura', estado: 'cotizada', fotos: 0, descripcion: 'Pintar', distrito: 'Surco', creadaEn: new Date().toISOString() }],
    postulaciones: [],
    cotizaciones: [{ id: 'q1', solicitudId: 's1', estado: 'enviada', clienteId: 'C_CLIENT', providerAddress: 'C_PROVIDER', totalStroops: '12000000000', materialesStroops: '3600000000', materialsBps: 3000, feeBps: 500, reviewSecs: 86400, descripcion: 'Pintar' }],
    chooseProposal: vi.fn(), rejectQuote: vi.fn(), acceptQuote: state.acceptQuote,
  }),
}));

function mount() {
  render(<MemoryRouter initialEntries={['/solicitudes/s1']}><Routes>
    <Route path="/solicitudes/:id" element={<RequestDetailScreen />} />
    <Route path="/trabajos/:id" element={<p>Pedido confirmado</p>} />
  </Routes></MemoryRouter>);
}

beforeEach(() => {
  vi.resetAllMocks(); state.pending = null;
  vi.mocked(confirmDemoIdentity).mockResolvedValue(undefined);
  vi.mocked(escrow.createJob).mockResolvedValue({ jobId: 1n, hash: 'a'.repeat(64) });
  state.acceptQuote.mockResolvedValue(undefined);
});
afterEach(cleanup);

it('no crea ni acepta el pedido si se cancela la huella', async () => {
  vi.mocked(confirmDemoIdentity).mockRejectedValue(new DOMException('Cancelado', 'NotAllowedError'));
  mount(); fireEvent.click(screen.getByRole('button', { name: 'Aceptar cotización' }));
  await screen.findByRole('alert');
  expect(escrow.createJob).not.toHaveBeenCalled();
  expect(state.acceptQuote).not.toHaveBeenCalled();
});

it('espera la verificación e impide doble envío', async () => {
  let approve!: () => void;
  vi.mocked(confirmDemoIdentity).mockImplementation(() => new Promise(resolve => { approve = resolve; }));
  mount();
  const button = screen.getByRole('button', { name: 'Aceptar cotización' });
  fireEvent.click(button); fireEvent.click(button);
  expect(escrow.createJob).not.toHaveBeenCalled();
  expect(confirmDemoIdentity).toHaveBeenCalledExactlyOnceWith('C_CLIENT');
  approve();
  await screen.findByText('Pedido confirmado');
  expect(escrow.createJob).toHaveBeenCalledOnce();
});

it('un fallo de guardado reintenta el mismo pedido sin duplicarlo', async () => {
  state.acceptQuote.mockRejectedValueOnce(new Error('Sin conexión'));
  mount(); fireEvent.click(screen.getByRole('button', { name: 'Aceptar cotización' }));
  await screen.findByRole('alert');
  expect(state.pending?.jobId).toBe('1');
  fireEvent.click(screen.getByRole('button', { name: 'Aceptar cotización' }));
  await screen.findByText('Pedido confirmado');
  expect(escrow.createJob).toHaveBeenCalledOnce();
  expect(confirmDemoIdentity).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(state.acceptQuote).toHaveBeenLastCalledWith('q1', '1', 'a'.repeat(64)));
});
