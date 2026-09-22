/** Catálogo común: sin dependencias de React ni archivos JSON para el servidor. */
export const TRADES = ['Electricidad', 'Gasfitería', 'Cerrajería', 'Carpintería', 'Pintura', 'Instalaciones', 'Reparaciones', 'Limpieza', 'Aire Acondicionado', 'Más servicios'] as const;
export type Trade = typeof TRADES[number];
