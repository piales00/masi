import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DemoProvider } from '../demo/DemoContext';
import { NewRequestScreen } from './NewRequestScreen';

/**
 * El caso que falló en el celular: con una categoría ya elegida, la descripción no se
 * evaluaba y la sugerencia no aparecía nunca.
 */
function montar() {
  render(<DemoProvider><MemoryRouter><NewRequestScreen /></MemoryRouter></DemoProvider>);
}

const elegir = (servicio: string) => userEvent.click(screen.getByRole('button', { name: new RegExp(servicio) }));
const describir = (texto: string) => userEvent.type(screen.getByRole('textbox', { name: /Qué necesitas resolver/ }), texto);

/** El oficio seleccionado se ve en el chip que ofrece cambiarlo. */
const seleccionado = () => screen.getByRole('button', { name: 'Cambiar servicio' }).parentElement?.textContent ?? '';

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('sugerencia con una categoría ya elegida', () => {
  it('con Carpintería y un foco quemado propone Electricidad', async () => {
    montar();
    await elegir('Carpintería');
    await describir('Se quemo mi foco');

    expect(await screen.findByText('¿Quizás necesitas Electricidad?')).toBeTruthy();
    expect(screen.getByText(/parece estar más relacionada con un servicio de Electricidad/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cambiar a Electricidad' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mantener Carpintería' })).toBeTruthy();
  });

  it('cambiar solo cambia el servicio y conserva lo escrito', async () => {
    montar();
    await elegir('Carpintería');
    await describir('Se quemo mi foco');
    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar a Electricidad' }));

    expect(seleccionado()).toContain('Electricidad');
    expect(screen.getByRole('textbox', { name: /Qué necesitas resolver/ })).toHaveProperty('value', 'Se quemo mi foco');
    // Cambiado el oficio, ya no hay nada que sugerir.
    expect(screen.queryByText('¿Quizás necesitas Electricidad?')).toBeNull();
  });

  it('mantener conserva el oficio y no vuelve a preguntar por lo mismo', async () => {
    montar();
    await elegir('Carpintería');
    await describir('Se quemo mi foco');
    await userEvent.click(await screen.findByRole('button', { name: 'Mantener Carpintería' }));

    expect(screen.queryByText('¿Quizás necesitas Electricidad?')).toBeNull();
    expect(seleccionado()).toContain('Carpintería');

    // Seguir escribiendo sobre lo mismo no reabre la sugerencia: nada de bucle.
    await describir(' otra vez');
    expect(screen.queryByText('¿Quizás necesitas Electricidad?')).toBeNull();
    expect(screen.getByRole('button', { name: /Publicar solicitud/ }).hasAttribute('disabled')).toBe(false);
  });

  it('si después describe otra cosa, se vuelve a evaluar', async () => {
    montar();
    await elegir('Carpintería');
    await describir('Se quemo mi foco');
    await userEvent.click(await screen.findByRole('button', { name: 'Mantener Carpintería' }));

    await userEvent.clear(screen.getByRole('textbox', { name: /Qué necesitas resolver/ }));
    await describir('Hay una fuga en la tubería');

    expect(await screen.findByText('¿Quizás necesitas Gasfitería?')).toBeTruthy();
  });

  it('cortar una madera con Carpintería no propone Electricidad', async () => {
    montar();
    await elegir('Carpintería');
    await describir('Necesito cortar una madera');

    expect(screen.queryByText(/¿Quizás necesitas/)).toBeNull();
    expect(seleccionado()).toContain('Carpintería');
  });

  it('si la categoría ya coincide no sugiere nada', async () => {
    montar();
    await elegir('Electricidad');
    await describir('Se quemo mi foco');

    expect(screen.queryByText(/¿Quizás necesitas/)).toBeNull();
    expect(seleccionado()).toContain('Electricidad');
  });

  it('sin categoría elegida sigue funcionando la propuesta de siempre', async () => {
    montar();
    await describir('Se quemo mi foco');

    expect(await screen.findByText(/Parece que necesitas/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeTruthy();
  });
});
