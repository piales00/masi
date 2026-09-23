import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

/**
 * La foto del profesional vive en su propio recurso. Estas pruebas fijan que la lista de
 * propuestas no la arrastre —se pide aparte— y que sin foto queden las iniciales.
 */
const getFotoProfesional = vi.fn();
vi.mock('../api/client', () => ({ api: { getFotoProfesional: (id: string) => getFotoProfesional(id) } }));

const { AvatarProfesional, olvidarFotoProfesional } = await import('./AvatarProfesional');

const FOTO = `data:image/jpeg;base64,${'A'.repeat(40)}`;
const PROVEEDOR = 'CDFL7HNESV2Y4BGOD3VIDCTWLATJLBR5IEBDSUY2QZUZKK5CE2QFFFDQ';

afterEach(() => { cleanup(); getFotoProfesional.mockReset(); olvidarFotoProfesional(PROVEEDOR); });

describe('avatar del profesional', () => {
  it('muestra su foto cuando la tiene', async () => {
    getFotoProfesional.mockResolvedValue(FOTO);
    render(<AvatarProfesional providerId={PROVEEDOR} nombre="Jossep Ramírez" />);
    await waitFor(() => expect(screen.getByAltText('Foto de Jossep Ramírez').getAttribute('src')).toBe(FOTO));
  });

  it('sin foto deja las iniciales, que es lo de siempre', async () => {
    getFotoProfesional.mockResolvedValue(null);
    render(<AvatarProfesional providerId={PROVEEDOR} nombre="Jossep Ramírez" />);
    await waitFor(() => expect(getFotoProfesional).toHaveBeenCalled());
    expect(screen.queryByAltText(/^Foto de/)).toBeNull();
    expect(screen.getByText('JR')).toBeTruthy();
  });

  it('si la lectura falla no rompe la tarjeta', async () => {
    getFotoProfesional.mockRejectedValue(new Error('sin red'));
    render(<AvatarProfesional providerId={PROVEEDOR} nombre="Jossep Ramírez" />);
    await waitFor(() => expect(getFotoProfesional).toHaveBeenCalled());
    expect(screen.getByText('JR')).toBeTruthy();
  });

  it('sin profesional no pide nada', () => {
    render(<AvatarProfesional providerId={undefined} nombre="Alguien" />);
    expect(getFotoProfesional).not.toHaveBeenCalled();
  });

  it('no repite la petición del mismo profesional en una lista', async () => {
    getFotoProfesional.mockResolvedValue(FOTO);
    render(<div>
      <AvatarProfesional providerId={PROVEEDOR} nombre="Jossep" />
      <AvatarProfesional providerId={PROVEEDOR} nombre="Jossep" />
      <AvatarProfesional providerId={PROVEEDOR} nombre="Jossep" />
    </div>);
    await waitFor(() => expect(getFotoProfesional).toHaveBeenCalled());
    expect(getFotoProfesional).toHaveBeenCalledTimes(1);
  });
});
