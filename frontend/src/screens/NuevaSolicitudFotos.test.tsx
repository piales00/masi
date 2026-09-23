import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DemoProvider } from '../demo/DemoContext';
import { store } from '../demo/store';
import { FOTO_DEMASIADO_GRANDE, toStoredImage } from '../images';
import { NewRequestScreen } from './NewRequestScreen';

/** El navegador no comprime en las pruebas; lo que importa aquí es qué se manda. */
vi.mock('../images', async () => {
  const real = await vi.importActual<typeof import('../images')>('../images');
  return { ...real, toStoredImage: vi.fn() };
});

const COMPRIMIDA = 'data:image/jpeg;base64,aaaa';
const archivo = () => new File(['x'], 'cocina.jpg', { type: 'image/jpeg' });

function montar() {
  const vista = render(<DemoProvider><MemoryRouter><NewRequestScreen /></MemoryRouter></DemoProvider>);
  return vista.container.querySelector('input[type="file"]') as HTMLInputElement;
}

async function completar() {
  await userEvent.click(screen.getByRole('button', { name: /Pintura/ }));
  await userEvent.type(screen.getByRole('textbox', { name: /Qué necesitas resolver/ }), 'Pintar la sala');
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('publicar una solicitud con fotos', () => {
  it('manda las imágenes al almacén y guarda solo el recuento', async () => {
    vi.mocked(toStoredImage).mockResolvedValue(COMPRIMIDA);
    const espia = vi.spyOn(store, 'crearSolicitud');
    const entrada = montar();

    await completar();
    await userEvent.upload(entrada, archivo());
    await waitFor(() => expect(screen.getByAltText('cocina.jpg')).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: /Publicar solicitud/ }));

    await waitFor(() => expect(espia).toHaveBeenCalled());
    const [solicitud, fotos] = espia.mock.calls[0];
    expect(fotos).toEqual([COMPRIMIDA]);
    // En la solicitud viaja el número; las data URL van por su propio camino.
    expect(solicitud.fotos).toBe(1);
  });

  it('cuando una foto no se puede reducir, se dice y no se agrega', async () => {
    vi.mocked(toStoredImage).mockRejectedValue(new Error(FOTO_DEMASIADO_GRANDE));
    const entrada = montar();

    await userEvent.upload(entrada, archivo());

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', FOTO_DEMASIADO_GRANDE);
    expect(screen.queryByAltText('cocina.jpg')).toBeNull();
  });
});
