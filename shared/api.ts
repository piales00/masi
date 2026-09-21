import type { Trade } from '../frontend/src/marketplace';

/** Comisión de Masi: 5 %. La paga el cliente encima del total. */
export const FEE_BPS = 500;
/** Tope del contrato para el adelanto (50 %). */
export const MAX_MATERIALS_BPS = 5000;
/** Plazo de revisión por defecto: 24 h. */
export const DEFAULT_REVIEW_SECS = 86400;

export type SolicitudEstado =
  | 'buscando_profesionales'
  | 'profesional_elegido'
  | 'cotizada'
  | 'contratada';

export interface Solicitud {
  id: string;
  clienteId: string;
  servicio: Trade;
  descripcion: string;
  fotos: number;
  ubicacion: string;
  distrito: string;
  cliente: string;
  estado: SolicitudEstado;
  postulacionElegidaId: string | null;
  creadaEn: string;
  actualizadaEn: string;
}
export type SolicitudInput = Pick<Solicitud,
  'clienteId' | 'servicio' | 'descripcion' | 'fotos' | 'ubicacion' | 'distrito' | 'cliente'>;

export interface Postulacion {
  id: string;
  solicitudId: string;
  providerId: string;
  providerNombre: string;
  providerAddress: string | null;
  precio: number;
  minutos: number;
  fecha: string;
}
export type PostulacionInput = Omit<Postulacion, 'id' | 'fecha'>;

export type CotizacionEstado = 'enviada' | 'aceptada' | 'rechazada';

export interface Cotizacion {
  id: string;
  solicitudId: string;
  postulacionId: string;
  providerId: string;
  providerAddress: string;
  clienteId: string;
  totalStroops: string;
  materialesStroops: string;
  materialsBps: number;
  feeBps: number;
  reviewSecs: number;
  descripcion: string;
  estado: CotizacionEstado;
  jobId: string | null;
  txHash: string | null;
  creadaEn: string;
  actualizadaEn: string;
}
export type CotizacionInput = Pick<Cotizacion,
  'solicitudId' | 'postulacionId' | 'providerId' | 'providerAddress' | 'clienteId'
  | 'totalStroops' | 'materialesStroops' | 'materialsBps' | 'feeBps' | 'reviewSecs' | 'descripcion'>;

export type CotizacionPatch =
  | { estado: 'aceptada'; jobId: string; txHash: string }
  | { estado: 'rechazada' };

export interface Resena {
  jobId: string;
  providerId: string;
  providerAddress: string;
  estrellas: 1 | 2 | 3 | 4 | 5;
  texto: string;
  hash: string;
  creadaEn: string;
}
export type ResenaInput = Omit<Resena, 'jobId' | 'creadaEn'>;

export interface ApiError {
  error: {
    code: 'INVALID' | 'NOT_FOUND' | 'CONFLICT' | 'NOT_ALLOWED' | 'RELAYER' | 'INTERNAL';
    message: string;
  };
}
