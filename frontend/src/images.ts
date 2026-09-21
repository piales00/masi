/**
 * Las fotos de una solicitud se guardan como data URL dentro del propio registro.
 * Un `blob:` de URL.createObjectURL muere con la pestaña, así que al recargar la
 * solicitud se quedaba sin imagen; un data URL viaja con el JSON a localStorage.
 *
 * Se reescala antes de guardar porque localStorage ronda los 5 MB: una foto de
 * celular sin tocar se come esa cuota entera. Cuando exista almacenamiento real,
 * se sustituye este módulo por la subida y el resto de la app no cambia.
 */
const MAX_LADO = 800;
const CALIDAD = 0.6;

export async function toStoredImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('No se pudo procesar la imagen');
    contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', CALIDAD);
  } finally {
    bitmap.close();
  }
}
