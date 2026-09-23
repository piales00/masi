import { MAX_BYTES_FOTO } from './config';

/**
 * Las fotos de una solicitud viajan como data URL: se crean aquí, se mandan al crear la
 * solicitud y el servidor las guarda aparte del listado (ver `shared/api.ts`).
 *
 * Reescalar no basta. El servidor mide la data URL en caracteres y rechaza todo lo que
 * pase de `MAX_BYTES_FOTO`, así que aquí se comprueba el resultado: se baja la calidad y,
 * si aún no cabe, el lado máximo, hasta que entre. Una foto que no entre ni así se
 * rechaza con un mensaje que la persona pueda entender, no con un error del servidor.
 */
const LADOS = [800, 600];
const CALIDADES = [0.6, 0.5, 0.4, 0.3];

export const FOTO_DEMASIADO_GRANDE = 'Esta foto es demasiado grande. Prueba con otra.';

function reescalar(bitmap: ImageBitmap, lado: number): HTMLCanvasElement {
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * escala));
  canvas.height = Math.max(1, Math.round(bitmap.height * escala));
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('No se pudo procesar la imagen');
  contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function toStoredImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    for (const lado of LADOS) {
      const canvas = reescalar(bitmap, lado);
      for (const calidad of CALIDADES) {
        // JPEG siempre: es uno de los formatos que el servidor admite y el que menos pesa.
        const url = canvas.toDataURL('image/jpeg', calidad);
        if (url.length <= MAX_BYTES_FOTO) return url;
      }
    }
    throw new Error(FOTO_DEMASIADO_GRANDE);
  } finally {
    bitmap.close();
  }
}
