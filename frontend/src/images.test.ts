import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_BYTES_FOTO } from './config';
import { FOTO_DEMASIADO_GRANDE, toStoredImage } from './images';

/**
 * El servidor mide la data URL en caracteres y rechaza lo que pase de `MAX_BYTES_FOTO`.
 * Aquí se simula ese peso: crece con el área del lienzo y con la calidad, que es como se
 * comporta un JPEG. `densidad` sube o baja el resultado para colocar cada caso donde se
 * quiere probar, sin depender de un codificador real, que jsdom no tiene.
 */
let densidad = 1;
const intentos: { lado: number; calidad: number }[] = [];

const FOTO = new File([''], 'foto.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  densidad = 1;
  intentos.length = 0;
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 2000, height: 1000, close: () => {} })));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({ drawImage: () => {} } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL')
    .mockImplementation(function (this: HTMLCanvasElement, _tipo?: string, calidad?: number) {
      const q = calidad ?? 1;
      intentos.push({ lado: Math.max(this.width, this.height), calidad: q });
      const largo = Math.round(this.width * this.height * densidad * (0.4 + q));
      return `data:image/jpeg;base64,${'a'.repeat(largo)}`;
    });
});

describe('toStoredImage', () => {
  it('devuelve una foto que cabe en el límite del servidor', async () => {
    densidad = 0.5;

    const url = await toStoredImage(FOTO);

    expect(url.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(url.length).toBeLessThanOrEqual(MAX_BYTES_FOTO);
    // Con una sola pasada basta: no se degrada una foto que ya cabía.
    expect(intentos).toEqual([{ lado: 800, calidad: 0.6 }]);
  });

  it('baja la calidad hasta que entra, sin tocar el tamaño', async () => {
    densidad = 0.75;

    const url = await toStoredImage(FOTO);

    expect(url.length).toBeLessThanOrEqual(MAX_BYTES_FOTO);
    expect(intentos).toEqual([
      { lado: 800, calidad: 0.6 },
      { lado: 800, calidad: 0.5 },
      { lado: 800, calidad: 0.4 },
    ]);
  });

  it('si ni con la calidad mínima entra, reduce el lado y vuelve a probar', async () => {
    densidad = 1;

    const url = await toStoredImage(FOTO);

    expect(url.length).toBeLessThanOrEqual(MAX_BYTES_FOTO);
    expect(intentos.map(intento => intento.lado)).toEqual([800, 800, 800, 800, 600]);
    expect(intentos.at(-1)).toEqual({ lado: 600, calidad: 0.6 });
  });

  it('cuando no hay manera, lo dice con palabras que la persona entiende', async () => {
    densidad = 2;

    await expect(toStoredImage(FOTO)).rejects.toThrow(FOTO_DEMASIADO_GRANDE);
    // Lo intentó todo antes de rendirse: dos tamaños por cuatro calidades.
    expect(intentos).toHaveLength(8);
  });

  it('suelta el bitmap pase lo que pase', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 2000, height: 1000, close })));
    densidad = 2;

    await expect(toStoredImage(FOTO)).rejects.toThrow();
    expect(close).toHaveBeenCalled();
  });
});
