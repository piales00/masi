import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DemoProvider, readProviderForAddress, useDemo } from './DemoContext';
import type { ProviderProfile } from './DemoContext';

/**
 * La foto del profesional vive en este navegador, junto al resto de su perfil y bajo la
 * clave de su propia cuenta. No viaja entre dispositivos —esa copia es la del servidor—,
 * pero sí tiene que sobrevivir a una recarga y a volver a entrar.
 */
const CUENTA_A = 'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K';
const CUENTA_B = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const FOTO_A = 'data:image/jpeg;base64,aaaa';
const FOTO_B = 'data:image/jpeg;base64,bbbb';
const OTRA_A = 'data:image/jpeg;base64,cccc';

const perfil = (contractId: string, fullName: string, photoUrl?: string): ProviderProfile => ({
  id: contractId, contractId, fullName, services: ['Pintura'],
  district: 'Chorrillos', yearsExperience: 4, bio: '', photoUrl,
});

/** Una pantalla mínima: guarda lo que se le pida y enseña la foto que tenga el perfil. */
function Pantalla({ guardar, salir }: { guardar?: ProviderProfile; salir?: boolean }) {
  const { providerProfile, saveProviderProfile, signOut } = useDemo();
  return <div>
    <p data-testid="foto">{providerProfile?.photoUrl ?? 'sin foto'}</p>
    <p data-testid="nombre">{providerProfile?.fullName ?? 'sin sesión'}</p>
    <button type="button" onClick={() => guardar && saveProviderProfile(guardar)}>Guardar</button>
    <button type="button" onClick={() => salir && signOut('provider')}>Salir</button>
  </div>;
}

const montar = (props: { guardar?: ProviderProfile; salir?: boolean } = {}) =>
  render(<DemoProvider><Pantalla {...props} /></DemoProvider>);

const foto = () => screen.getByTestId('foto').textContent;
const guardar = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
const salir = () => fireEvent.click(screen.getByRole('button', { name: 'Salir' }));

/** Cerrar y volver a abrir el navegador: el almacenamiento queda, el árbol no. */
const reabrir = (props: { guardar?: ProviderProfile; salir?: boolean } = {}) => {
  cleanup();
  return montar(props);
};

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('la foto del profesional dura lo que dure este navegador', () => {
  it('sigue ahí después de recargar', () => {
    montar({ guardar: perfil(CUENTA_A, 'Ana Quispe', FOTO_A) });
    guardar();
    expect(foto()).toBe(FOTO_A);

    reabrir();
    expect(foto()).toBe(FOTO_A);
  });

  it('sigue ahí después de cerrar sesión y volver a entrar con la misma cuenta', () => {
    montar({ guardar: perfil(CUENTA_A, 'Ana Quispe', FOTO_A), salir: true });
    guardar();
    salir();
    expect(screen.getByTestId('nombre').textContent).toBe('sin sesión');

    // Volver a entrar es leer la cuenta por su dirección, como hace la pantalla de acceso.
    const guardada = readProviderForAddress(CUENTA_A);
    expect(guardada?.photoUrl).toBe(FOTO_A);

    reabrir({ guardar: guardada ?? undefined });
    guardar();
    expect(foto()).toBe(FOTO_A);
  });

  it('cambiarla sustituye a la anterior, también tras recargar', () => {
    montar({ guardar: perfil(CUENTA_A, 'Ana Quispe', FOTO_A) });
    guardar();
    cleanup();

    montar({ guardar: perfil(CUENTA_A, 'Ana Quispe', OTRA_A) });
    guardar();
    expect(foto()).toBe(OTRA_A);

    reabrir();
    expect(foto()).toBe(OTRA_A);
    expect(readProviderForAddress(CUENTA_A)?.photoUrl).toBe(OTRA_A);
  });

  it('dos cuentas en el mismo navegador no se cruzan las fotos', () => {
    montar({ guardar: perfil(CUENTA_A, 'Ana Quispe', FOTO_A) });
    guardar();
    cleanup();

    montar({ guardar: perfil(CUENTA_B, 'Beto Ríos', FOTO_B) });
    guardar();
    expect(foto()).toBe(FOTO_B);

    // Cada cuenta conserva la suya en su propia clave.
    expect(readProviderForAddress(CUENTA_A)?.photoUrl).toBe(FOTO_A);
    expect(readProviderForAddress(CUENTA_B)?.photoUrl).toBe(FOTO_B);
  });

  it('un profesional sin foto se queda con sus iniciales, no hereda ninguna', () => {
    montar({ guardar: perfil(CUENTA_A, 'Ana Quispe', FOTO_A) });
    guardar();
    cleanup();

    montar({ guardar: perfil(CUENTA_B, 'Beto Ríos') });
    guardar();
    expect(foto()).toBe('sin foto');

    reabrir();
    expect(foto()).toBe('sin foto');
    expect(readProviderForAddress(CUENTA_B)?.photoUrl).toBeUndefined();
  });

  it('una foto vacía guardada por error no cuenta como foto', () => {
    localStorage.setItem('masi.demo.profesional.v2', JSON.stringify({ ...perfil(CUENTA_A, 'Ana Quispe'), photoUrl: '' }));
    localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: false, provider: true }));
    montar();

    expect(foto()).toBe('sin foto');
  });
});
