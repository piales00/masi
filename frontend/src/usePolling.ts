import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Relee cada `intervalo` mientras la pestaña está visible. Oculta, se detiene: cada
 * vuelta son comandos del almacén, y una pestaña que nadie mira no necesita datos frescos.
 *
 * Al volver a mostrarse recarga de inmediato, así que quien cambia de pestaña ve lo
 * último sin esperar el siguiente ciclo. Devuelve el error de la última carga y un
 * `recargar` para reintentar a mano.
 */
export function usePolling(
  cargar: () => Promise<void>,
  opciones: { intervalo?: number; activo?: boolean } = {},
): { error: string; recargar: () => void } {
  const { intervalo = 10_000, activo = true } = opciones;
  const [error, setError] = useState('');
  // La función cambia en cada render; el ciclo no debe reiniciarse por eso.
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;

  const ejecutar = useCallback(async () => {
    try {
      await cargarRef.current();
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Algo salió mal. Inténtalo de nuevo.');
    }
  }, []);

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    let temporizador: ReturnType<typeof setInterval> | undefined;

    const detener = () => {
      if (temporizador !== undefined) clearInterval(temporizador);
      temporizador = undefined;
    };

    const arrancar = () => {
      detener();
      if (!vivo || document.hidden) return;
      void ejecutar();
      temporizador = setInterval(() => { void ejecutar(); }, intervalo);
    };

    arrancar();
    document.addEventListener('visibilitychange', arrancar);
    return () => {
      vivo = false;
      detener();
      document.removeEventListener('visibilitychange', arrancar);
    };
  }, [activo, intervalo, ejecutar]);

  return { error, recargar: () => { void ejecutar(); } };
}
