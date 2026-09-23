import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DemoProvider } from '../demo/DemoContext';

const abrirRetiro = vi.fn();
const seguirRetiro = vi.fn();
const signAuthEntry = vi.fn();

vi.mock('../anchor/retiro', async () => {
  const real = await vi.importActual<typeof import('../anchor/retiro')>('../anchor/retiro');
  return { ...real, abrirRetiro: (...a: unknown[]) => abrirRetiro(...a), seguirRetiro: (...a: unknown[]) => seguirRetiro(...a) };
});
vi.mock('../passkeys', () => ({ signAuthEntry: (...a: unknown[]) => signAuthEntry(...a) }));

const { WithdrawScreen } = await import('./WithdrawScreen');

const CUENTA = 'CC7TK7EBJT46ECHSE726ALGNVGNTHSHJA65BCGRCLS7E4UQ5TPYMMXKO';
const SESION = { transferServer: 'https://testanchor.stellar.org/sep24', token: 'jwt', id: 'tx-1', url: 'https://anchor/interactivo' };

/** Sin valor por defecto a propósito: pasar `undefined` lo activaría y la cuenta volvería. */
function sembrar(contractId: string | undefined) {
  localStorage.clear();
  localStorage.setItem('masi.demo.profesional.v2', JSON.stringify({
    id: contractId ?? 'provider', fullName: 'Marely Salas', services: ['Pintura'],
    district: 'Surco', yearsExperience: 3, bio: '', contractId,
  }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: false, provider: true }));
}

const pintar = () => render(
  <MemoryRouter><DemoProvider><WithdrawScreen /></DemoProvider></MemoryRouter>,
);

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('pantalla de retiro', () => {
  it('se identifica con la huella y ofrece abrir la ventana del anchor', async () => {
    sembrar(CUENTA);
    abrirRetiro.mockResolvedValue(SESION);
    seguirRetiro.mockResolvedValue({ id: 'tx-1', status: 'incomplete' });
    pintar();

    fireEvent.click(screen.getByRole('button', { name: /Retirar a mi banco/ }));

    const enlace = await screen.findByRole('link', { name: /Abrir la ventana segura/ });
    expect(enlace.getAttribute('href')).toBe(SESION.url);
    expect(enlace.getAttribute('target')).toBe('_blank');
    // La cuenta que se identifica es la del profesional conectado.
    expect(abrirRetiro.mock.calls[0][0]).toBe(CUENTA);
  });

  it('traduce el estado que devuelve el anchor', async () => {
    sembrar(CUENTA);
    abrirRetiro.mockResolvedValue(SESION);
    seguirRetiro.mockResolvedValue({ id: 'tx-1', status: 'pending_anchor' });
    pintar();

    fireEvent.click(screen.getByRole('button', { name: /Retirar a mi banco/ }));
    expect(await screen.findByText('El anchor está procesando tu retiro.')).toBeTruthy();
  });

  it('firma la entrada con la cuenta del profesional', async () => {
    sembrar(CUENTA);
    abrirRetiro.mockImplementation(async (_cuenta: string, firmar: (e: unknown, x: number) => unknown) => {
      await firmar({ entrada: true }, 4829373);
      return SESION;
    });
    seguirRetiro.mockResolvedValue({ id: 'tx-1', status: 'incomplete' });
    pintar();

    fireEvent.click(screen.getByRole('button', { name: /Retirar a mi banco/ }));
    await waitFor(() => expect(signAuthEntry).toHaveBeenCalled());
    expect(signAuthEntry.mock.calls[0][1]).toBe(CUENTA);
    expect(signAuthEntry.mock.calls[0][2]).toBe(4829373);
  });

  it('muestra el fallo sin dejar el botón bloqueado', async () => {
    sembrar(CUENTA);
    abrirRetiro.mockRejectedValue(new Error('El reto es para otra cuenta.'));
    pintar();

    fireEvent.click(screen.getByRole('button', { name: /Retirar a mi banco/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('El reto es para otra cuenta.');
    expect((screen.getByRole('button', { name: /Retirar a mi banco/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('no deja retirar sin cuenta conectada', () => {
    sembrar(undefined);
    pintar();
    expect((screen.getByRole('button', { name: /Retirar a mi banco/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/entra con tu cuenta de profesional/)).toBeTruthy();
  });

  it('dice que el activo es de pruebas y nombra a Anclap como el paso real', () => {
    sembrar(CUENTA);
    pintar();
    expect(screen.getByText(/testanchor.stellar.org/)).toBeTruthy();
    expect(screen.getByText(/Anclap/)).toBeTruthy();
  });
});

describe('cuando el anchor de pruebas no admite la firma con huella', () => {
  it('da la solicitud por recibida en vez de enseñar un error', async () => {
    sembrar(CUENTA);
    abrirRetiro.mockRejectedValue(new Error('ANCHOR_SIN_SOPORTE_PASSKEY'));
    pintar();

    fireEvent.click(screen.getByRole('button', { name: /Retirar a mi banco/ }));
    expect(await screen.findByText('Solicitud de retiro recibida')).toBeTruthy();
    expect(screen.getByText(/máximo de 24 horas/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('el aviso de demo sigue a la vista: el retiro no mueve dinero real', async () => {
    sembrar(CUENTA);
    abrirRetiro.mockRejectedValue(new Error('ANCHOR_SIN_SOPORTE_PASSKEY'));
    pintar();

    fireEvent.click(screen.getByRole('button', { name: /Retirar a mi banco/ }));
    await screen.findByText('Solicitud de retiro recibida');
    expect(screen.getByText(/no mueve dinero real/)).toBeTruthy();
  });
});
