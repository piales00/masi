import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { usePolling } from './usePolling';

function Sonda({ cargar, activo = true }: { cargar: () => Promise<void>; activo?: boolean }) {
  const { error, recargar } = usePolling(cargar, { intervalo: 10_000, activo });
  return <button onClick={recargar}>{error || 'sin error'}</button>;
}

/** Cambia document.hidden y avisa como hace el navegador. */
function ocultar(oculto: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => oculto });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  ocultar(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('usePolling', () => {
  it('carga al montar y repite cada intervalo', async () => {
    const cargar = vi.fn().mockResolvedValue(undefined);
    render(<Sonda cargar={cargar} />);
    expect(cargar).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(cargar).toHaveBeenCalledTimes(2);

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(cargar).toHaveBeenCalledTimes(3);
  });

  it('no hace nada cuando está inactivo', async () => {
    const cargar = vi.fn().mockResolvedValue(undefined);
    render(<Sonda cargar={cargar} activo={false} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(cargar).not.toHaveBeenCalled();
  });

  it('se detiene con la pestaña oculta y recarga al volver', async () => {
    const cargar = vi.fn().mockResolvedValue(undefined);
    render(<Sonda cargar={cargar} />);
    expect(cargar).toHaveBeenCalledTimes(1);

    act(() => { ocultar(true); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(cargar).toHaveBeenCalledTimes(1);

    await act(async () => { ocultar(false); });
    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it('deja de repetir al desmontar y quita el listener', async () => {
    const cargar = vi.fn().mockResolvedValue(undefined);
    const quitar = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<Sonda cargar={cargar} />);

    unmount();
    expect(quitar).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(cargar).toHaveBeenCalledTimes(1);
    quitar.mockRestore();
  });

  it('una carga que falla deja el error y la siguiente lo limpia', async () => {
    const cargar = vi.fn()
      .mockRejectedValueOnce(new Error('Algo salió mal. Inténtalo de nuevo.'))
      .mockResolvedValue(undefined);
    const { container } = render(<Sonda cargar={cargar} />);

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(container.textContent).toBe('Algo salió mal. Inténtalo de nuevo.');

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(container.textContent).toBe('sin error');
  });

  it('no reinicia el ciclo porque cambie la función de carga', async () => {
    const cargar = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<Sonda cargar={cargar} />);
    expect(cargar).toHaveBeenCalledTimes(1);

    // Otra referencia en cada render no debe provocar una carga extra.
    rerender(<Sonda cargar={vi.fn().mockResolvedValue(undefined)} />);
    rerender(<Sonda cargar={vi.fn().mockResolvedValue(undefined)} />);
    expect(cargar).toHaveBeenCalledTimes(1);
  });
});
