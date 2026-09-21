import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { DemoProvider, readProfileForAddress, readProviderForAddress, useDemo } from '../demo/DemoContext';
import { AccessScreen } from './AccessScreen';
import { ProviderSetupScreen } from './ProviderSetupScreen';
import { SetupScreen } from './SetupScreen';
import { createAccount, signIn } from '../passkeys';

vi.mock('../passkeys', () => ({
  signIn: vi.fn(), createAccount: vi.fn(), hasPendingAccount: () => false,
}));

function Destination() {
  const { profile, providerProfile, clienteId } = useDemo();
  const location = useLocation();
  return <pre data-testid="destination">{JSON.stringify({ profile, providerProfile, clienteId, path: location.pathname })}</pre>;
}

function mount(path: string) {
  return render(<DemoProvider><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/acceso" element={<AccessScreen />} />
    <Route path="/configuracion" element={<SetupScreen />} />
    <Route path="/profesional/configuracion" element={<ProviderSetupScreen />} />
    <Route path="/home" element={<Destination />} />
    <Route path="/profesional" element={<Destination />} />
  </Routes></MemoryRouter></DemoProvider>);
}

beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); });
afterEach(cleanup);

describe('integración de perfiles y passkeys después del merge', () => {
  it('restaura el cliente autenticado y conserva su cuenta tras recargar', async () => {
    const profile = { firstName: 'María', lastName: 'Torres', phone: '', district: 'Surco', contractId: 'C_CLIENT', deploymentHash: 'hash' };
    localStorage.setItem('masi.profile.C_CLIENT', JSON.stringify(profile));
    vi.mocked(signIn).mockResolvedValue('C_CLIENT');
    const view = mount('/acceso');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect((await screen.findByTestId('destination')).textContent).toContain('María');
    expect(screen.getByTestId('destination').textContent).toContain('"clienteId":"C_CLIENT"');
    view.unmount();
    mount('/home');
    expect(screen.getByTestId('destination').textContent).toContain('"deploymentHash":"hash"');
    expect(readProfileForAddress('C_OTHER')).toBeNull();
  });

  it('envía al profesional autenticado a su propia pantalla', async () => {
    localStorage.setItem('masi.provider.C_PROVIDER', JSON.stringify({ id: 'C_PROVIDER', fullName: 'Juan', services: ['Pintura'], district: 'Surco', yearsExperience: 8, bio: '', contractId: 'C_PROVIDER' }));
    vi.mocked(signIn).mockResolvedValue('C_PROVIDER');
    mount('/acceso?rol=profesional');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    const result = JSON.parse((await screen.findByTestId('destination')).textContent!);
    expect(result.path).toBe('/profesional');
    expect(result.profile).toBeNull();
    expect(result.providerProfile.contractId).toBe('C_PROVIDER');
  });

  it('no abre una sesión si la passkey falla', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('Acceso cancelado'));
    mount('/acceso');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Acceso cancelado');
    expect(screen.queryByTestId('destination')).toBeNull();
    expect(localStorage.getItem('masi.demo.sesion.v2')).toBeNull();
  });

  it('crea la cuenta del cliente y guarda el comprobante', async () => {
    vi.mocked(createAccount).mockResolvedValue({ contractId: 'C_NEW', hash: 'receipt', confirmed: true });
    mount('/configuracion');
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'María' } });
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Torres' } });
    fireEvent.change(screen.getByLabelText('Distrito'), { target: { value: 'Surco' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta con huella' }));
    await screen.findByTestId('destination');
    expect(createAccount).toHaveBeenCalledWith('María Torres');
    expect(readProfileForAddress('C_NEW')?.deploymentHash).toBe('receipt');
  });

  it('completa un perfil profesional existente sin crear otra passkey', async () => {
    vi.mocked(signIn).mockResolvedValue('C_EXISTING');
    mount('/acceso?rol=profesional');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await screen.findByLabelText('Nombre completo');
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Juan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pintura' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Surco' } });
    fireEvent.change(screen.getByLabelText('Años de experiencia'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));
    await waitFor(() => expect(readProviderForAddress('C_EXISTING')?.fullName).toBe('Juan'));
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('crea la cuenta profesional usando el mismo flujo real de passkeys', async () => {
    vi.mocked(createAccount).mockResolvedValue({ contractId: 'C_NEW_PROVIDER', hash: 'receipt', confirmed: true });
    mount('/profesional/configuracion');
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Juan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pintura' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Surco' } });
    fireEvent.change(screen.getByLabelText('Años de experiencia'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta con huella' }));
    await screen.findByTestId('destination');
    expect(createAccount).toHaveBeenCalledWith('Juan');
    expect(readProviderForAddress('C_NEW_PROVIDER')?.deploymentHash).toBe('receipt');
  });
});
