import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Cotizacion, CotizacionInput, SolicitudEstado } from '../../../shared/api';
import type { Resena, ResenaInput } from '../../../shared/api';
import { providers } from '../marketplace';
import { usePolling } from '../usePolling';
import { store } from './store';
import type { Trade } from '../marketplace';

export type { Cotizacion } from '../../../shared/api';

export interface Profile {
  firstName: string;
  lastName: string;
  phone: string;
  district: string;
  role?: 'cliente' | 'profesional';
  contractId?: string;
  deploymentHash?: string;
}

export interface ProviderProfile {
  contractId?: string;
  deploymentHash?: string;
  id: string;
  fullName: string;
  services: Trade[];
  district: string;
  yearsExperience: number;
  bio: string;
  /** Vista previa local: no se guarda, así que tras recargar el avatar vuelve a las iniciales. */
  photoUrl?: string;
}

/** Los estados los define shared/api.ts; aquí no se inventan strings. */
export type EstadoSolicitud = SolicitudEstado;

export interface Solicitud {
  id: string;
  servicio: Trade;
  descripcion: string;
  /** Fotos del cliente como data URL, para que sobrevivan a la recarga. Ver images.ts. */
  fotos: string[];
  ubicacion: string;
  distrito: string;
  /** Urgencia elegida en el formulario; vacío en registros anteriores a este campo. */
  cuando: string;
  /** Nombre para mostrar. La identidad estable es clienteId. */
  cliente: string;
  clienteId: string;
  estado: EstadoSolicitud;
  postulacionElegidaId?: string;
  creadaEn: string;
}

/**
 * Copia de lo público del profesional al momento de postular. El cliente no puede leer
 * la cuenta del profesional, así que la propuesta se lleva consigo lo que debe mostrar.
 * Ausente en propuestas anteriores a este campo y en las del catálogo, que ya tienen ficha.
 */
export interface ProviderSnapshot {
  servicios: Trade[];
  distrito: string;
  aniosExperiencia: number;
  bio: string;
}

export interface Postulacion {
  id: string;
  solicitudId: string;
  providerId: string;
  /** El oficio no se repite aquí: lo aporta la solicitud a la que pertenece. */
  providerNombre: string;
  /** Dirección del catálogo cuando el id coincide; null mientras no tenga cuenta. */
  providerAddress: string | null;
  providerPerfil?: ProviderSnapshot;
  precio: number;
  minutos: number;
  fecha: string;
}

export const PROVIDER_FALLBACK_NAME = 'Profesional de Masi';

export type Role = 'client' | 'provider';

/**
 * Cuatro cajones separados. Las cuentas quedan guardadas aunque se cierre sesión, y
 * las solicitudes y postulaciones son datos compartidos entre los dos roles: nunca se
 * borran al salir, o el cliente publicaría algo que el profesional jamás vería.
 */
const CLIENT_KEY = 'masi.demo.cliente.v2';
const CLIENT_ID_KEY = 'masi.demo.clienteId.v1';
const PROVIDER_KEY = 'masi.demo.profesional.v2';
const SESSION_KEY = 'masi.demo.sesion.v2';
const REQUESTS_KEY = 'masi.demo.solicitudes.v1';
const PROPOSALS_KEY = 'masi.demo.postulaciones.v1';
const QUOTES_KEY = 'masi.demo.cotizaciones.v1';
const PENDING_ACCEPT_KEY = 'masi.demo.aceptacionPendiente.v1';
const AVAILABLE_KEY = 'masi.demo.disponible.v1';

export const RETURNING_PROFILE: Profile = {
  firstName: 'María',
  lastName: 'Torres',
  phone: '999 888 777',
  district: 'Chorrillos, Lima',
};

export const RETURNING_PROVIDER_PROFILE: ProviderProfile = {
  id: 'juan',
  fullName: 'Juan Ramírez',
  services: ['Pintura'],
  district: 'Surco',
  yearsExperience: 8,
  bio: 'Dale una nueva vida a tus paredes, con atención a cada detalle.',
};

interface Session { client: boolean; provider: boolean }

function read<T>(key: string, parse: (value: unknown) => T | null): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? parse(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento la demo sigue funcionando; solo no sobrevive a una recarga.
  }
}

const parseProfile = (value: unknown): Profile | null => {
  const row = value as Partial<Profile> | null;
  if (!row || typeof row.firstName !== 'string' || !row.firstName.trim()) return null;
  return {
    firstName: row.firstName,
    role: row.role === 'profesional' ? 'profesional' : 'cliente',
    lastName: typeof row.lastName === 'string' ? row.lastName : '',
    phone: typeof row.phone === 'string' ? row.phone : '',
    district: typeof row.district === 'string' ? row.district : '',
    contractId: typeof row.contractId === 'string' ? row.contractId : undefined,
    deploymentHash: typeof row.deploymentHash === 'string' ? row.deploymentHash : undefined,
  };
};

const parseProviderProfile = (value: unknown): ProviderProfile | null => {
  const row = value as Partial<ProviderProfile> | null;
  if (!row || typeof row.fullName !== 'string' || !row.fullName.trim()) return null;
  return {
    id: typeof row.id === 'string' && row.id ? row.id : 'provider',
    fullName: row.fullName,
    services: Array.isArray(row.services) ? row.services as Trade[] : [],
    district: typeof row.district === 'string' ? row.district : '',
    yearsExperience: typeof row.yearsExperience === 'number' ? row.yearsExperience : 0,
    bio: typeof row.bio === 'string' ? row.bio : '',
    contractId: typeof row.contractId === 'string' ? row.contractId : undefined,
    deploymentHash: typeof row.deploymentHash === 'string' ? row.deploymentHash : undefined,
  };
};

export function readProfileForAddress(contractId: string): Profile | null {
  const profile = read(`masi.profile.${contractId}`, parseProfile);
  return profile?.contractId === contractId ? profile : null;
}

export function readProviderForAddress(contractId: string): ProviderProfile | null {
  const profile = read(`masi.provider.${contractId}`, parseProviderProfile);
  return profile?.contractId === contractId ? profile : null;
}

const parseSession = (value: unknown): Session | null => {
  const row = value as Partial<Session> | null;
  if (!row) return null;
  return { client: row.client === true, provider: row.provider === true };
};

const parseList = <T,>(value: unknown): T[] | null => (Array.isArray(value) ? value as T[] : null);

const ESTADOS: readonly EstadoSolicitud[] = ['buscando_profesionales', 'profesional_elegido', 'cotizada', 'contratada'];

/** Dirección del profesional cuando su id corresponde a una ficha del catálogo. */
export const addressOfProvider = (providerId: string): string | null =>
  providers.find(item => item.id === providerId)?.address ?? null;

/** Ídem con el nombre: el catálogo es una fuente real, no un invento del fallback. */
export const nameOfProvider = (providerId: string): string | null =>
  providers.find(item => item.id === providerId)?.name ?? null;

/**
 * Dirección con la que el profesional va a firmar. Manda la cuenta creada con huella,
 * que trae su propio `contractId`; el catálogo solo respalda a los profesionales de
 * muestra, que no tienen cuenta. Sin ninguna de las dos se devuelve null a propósito:
 * la postulación queda sin dirección y la cotización sigue bloqueada, como hasta ahora.
 *
 * Se exige que la cuenta sea la de ese mismo profesional para que una sesión guardada
 * no preste su dirección a la postulación de otro.
 */
export function providerAddressOf(cuenta: ProviderProfile | null, providerId: string): string | null {
  const propia = cuenta?.id === providerId ? cuenta.contractId?.trim() : undefined;
  return propia || addressOfProvider(providerId);
}

/**
 * createJob no se puede repetir: crearía un segundo trabajo. Si la aceptación se
 * interrumpe después de la firma, el recibo queda aquí y solo se reintenta el guardado.
 */
export interface AceptacionPendiente {
  cotizacionId: string;
  jobId: string;
  txHash: string;
}

export function writePendingAcceptance(value: AceptacionPendiente): void {
  write(PENDING_ACCEPT_KEY, value);
}

export function readPendingAcceptance(): AceptacionPendiente | null {
  return read<AceptacionPendiente>(PENDING_ACCEPT_KEY, value => {
    const row = value as Partial<AceptacionPendiente> | null;
    if (!row?.cotizacionId || !row.jobId || !row.txHash) return null;
    return { cotizacionId: row.cotizacionId, jobId: row.jobId, txHash: row.txHash };
  });
}

/**
 * Identidad local del cliente. Sustituye al nombre como clave de pertenencia; el día que
 * exista la dirección de la cuenta, se reemplaza este UUID por ella.
 */
function readOrCreateClientId(): string {
  const stored = read<string>(CLIENT_ID_KEY, value => (typeof value === 'string' && value ? value : null));
  if (stored) return stored;
  const created = crypto.randomUUID();
  write(CLIENT_ID_KEY, created);
  return created;
}

/** Los registros guardados antes de esta versión no traen clienteId ni providerNombre. */
function migrateSolicitudes(rows: Solicitud[], clienteId: string): Solicitud[] {
  return rows.map(row => ({
    ...row,
    clienteId: typeof row.clienteId === 'string' && row.clienteId ? row.clienteId : clienteId,
    cuando: typeof row.cuando === 'string' ? row.cuando : '',
    // Antes solo se guardaba el conteo, así que de esas solicitudes no hay imagen que recuperar.
    fotos: Array.isArray(row.fotos) ? row.fotos.filter(foto => typeof foto === 'string') : [],
    estado: ESTADOS.includes(row.estado) ? row.estado : 'buscando_profesionales',
  }));
}

function migratePostulaciones(rows: Postulacion[]): Postulacion[] {
  return rows.map(row => ({
    ...row,
    providerNombre: (typeof row.providerNombre === 'string' && row.providerNombre.trim())
      || nameOfProvider(row.providerId)
      || PROVIDER_FALLBACK_NAME,
    providerAddress: typeof row.providerAddress === 'string' ? row.providerAddress : addressOfProvider(row.providerId),
  }));
}

interface DemoValue {
  profile: Profile | null;
  clienteId: string;
  providerProfile: ProviderProfile | null;
  solicitudes: Solicitud[];
  postulaciones: Postulacion[];
  cotizaciones: Cotizacion[];
  available: boolean;
  saveProfile: (profile: Profile) => void;
  saveProviderProfile: (profile: ProviderProfile) => void;
  /** Reabre la cuenta guardada de ese rol; si no hay ninguna, usa la de ejemplo. */
  signInClient: (fallback: Profile) => void;
  signInProvider: (fallback: ProviderProfile) => void;
  signOut: (role: Role) => void;
  /** Async desde ya: en F5 solo cambia la implementación, no las pantallas. */
  publishRequest: (input: Omit<Solicitud, 'id' | 'estado' | 'creadaEn' | 'clienteId'>) => Promise<Solicitud>;
  sendProposal: (input: Omit<Postulacion, 'id' | 'fecha' | 'providerNombre' | 'providerAddress' | 'providerPerfil'>) => Promise<Postulacion>;
  chooseProposal: (solicitudId: string, postulacionId: string) => Promise<Solicitud>;
  sendQuote: (input: CotizacionInput) => Promise<Cotizacion>;
  acceptQuote: (id: string, jobId: string, txHash: string) => Promise<Cotizacion>;
  rejectQuote: (id: string) => Promise<Cotizacion>;
  /** Guarda la reseña donde corresponda según el almacén activo. */
  saveReview: (jobId: string, input: ResenaInput) => Promise<Resena>;
  readReview: (jobId: string) => Promise<Resena | null>;
  /** Vacío cuando el almacén responde; con texto cuando la última lectura falló. */
  syncError: string;
  retrySync: () => void;
  setAvailable: (next: boolean) => void;
}

const DemoContext = createContext<DemoValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [clientAccount, setClientAccount] = useState<Profile | null>(() => read(CLIENT_KEY, parseProfile));
  const [providerAccount, setProviderAccount] = useState<ProviderProfile | null>(() => read(PROVIDER_KEY, parseProviderProfile));
  const [session, setSession] = useState<Session>(() => read(SESSION_KEY, parseSession) ?? { client: false, provider: false });
  const [legacyClientId] = useState(readOrCreateClientId);
  const clienteId = clientAccount?.contractId ?? legacyClientId;
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>(() => migrateSolicitudes(read(REQUESTS_KEY, parseList<Solicitud>) ?? [], legacyClientId));
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>(() => migratePostulaciones(read(PROPOSALS_KEY, parseList<Postulacion>) ?? []));
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>(() => read(QUOTES_KEY, parseList<Cotizacion>) ?? []);
  const [available, setAvailableState] = useState<boolean>(() => read<boolean>(AVAILABLE_KEY, v => (typeof v === 'boolean' ? v : null)) ?? true);

  /** En modo API la fuente es el almacén compartido: no se duplica en localStorage. */
  const persistir = useCallback((key: string, value: unknown) => {
    if (!store.remoto) write(key, value);
  }, []);

  /** Relee lo compartido. En local devuelve null y no toca el estado. */
  const cargar = useCallback(async () => {
    const datos = await store.cargar();
    if (!datos) return;
    setSolicitudes(datos.solicitudes);
    setPostulaciones(datos.postulaciones);
    setCotizaciones(datos.cotizaciones);
  }, []);

  const { error: syncError, recargar: retrySync } = usePolling(cargar, { activo: store.remoto, intervalo: 3000 });

  const openSession = useCallback((role: Role) => {
    setSession(current => {
      const next = { ...current, [role]: true };
      write(SESSION_KEY, next);
      return next;
    });
  }, []);

  const saveProfile = useCallback((next: Profile) => {
    setClientAccount(next);
    write(CLIENT_KEY, next);
    if (next.contractId) write(`masi.profile.${next.contractId}`, next);
    openSession('client');
  }, [openSession]);

  const saveProviderProfile = useCallback((next: ProviderProfile) => {
    setProviderAccount(next);
    // photoUrl queda fuera: es una URL de objeto que no sobrevive a la recarga.
    const { photoUrl: _photoUrl, ...persisted } = next;
    write(PROVIDER_KEY, persisted);
    if (next.contractId) write(`masi.provider.${next.contractId}`, persisted);
    openSession('provider');
  }, [openSession]);

  const signInClient = useCallback((fallback: Profile) => {
    if (!clientAccount) {
      setClientAccount(fallback);
      write(CLIENT_KEY, fallback);
    }
    openSession('client');
  }, [clientAccount, openSession]);

  const signInProvider = useCallback((fallback: ProviderProfile) => {
    if (!providerAccount) {
      setProviderAccount(fallback);
      write(PROVIDER_KEY, fallback);
    }
    openSession('provider');
  }, [providerAccount, openSession]);

  /** Cierra solo ese rol. La cuenta queda guardada para volver a entrar con ella. */
  const signOut = useCallback((role: Role) => {
    setSession(current => {
      const next = { ...current, [role]: false };
      write(SESSION_KEY, next);
      return next;
    });
  }, []);

  const publishRequest = useCallback(async (input: Omit<Solicitud, 'id' | 'estado' | 'creadaEn' | 'clienteId'>) => {
    const solicitud: Solicitud = {
      ...input,
      id: crypto.randomUUID(),
      clienteId,
      estado: 'buscando_profesionales',
      creadaEn: new Date().toISOString(),
    };
    const creada = await store.crearSolicitud(solicitud);
    setSolicitudes(current => {
      const next = [creada, ...current];
      persistir(REQUESTS_KEY, next);
      return next;
    });
    return creada;
  }, [clienteId, persistir]);

  const sendProposal = useCallback(async (input: Omit<Postulacion, 'id' | 'fecha' | 'providerNombre' | 'providerAddress' | 'providerPerfil'>) => {
    const postulacion: Postulacion = {
      ...input,
      id: crypto.randomUUID(),
      // El nombre de la cuenta manda; el catálogo lo respalda. El genérico es el último recurso.
      providerNombre: providerAccount?.fullName?.trim() || nameOfProvider(input.providerId) || PROVIDER_FALLBACK_NAME,
      providerAddress: providerAddressOf(providerAccount, input.providerId),
      providerPerfil: providerAccount
        ? {
          servicios: providerAccount.services,
          distrito: providerAccount.district,
          aniosExperiencia: providerAccount.yearsExperience,
          bio: providerAccount.bio,
        }
        : undefined,
      fecha: new Date().toISOString(),
    };
    const creada = await store.crearPostulacion(postulacion);
    setPostulaciones(current => {
      const next = [creada, ...current];
      persistir(PROPOSALS_KEY, next);
      return next;
    });
    return creada;
  }, [providerAccount, persistir]);

  const chooseProposal = useCallback(async (solicitudId: string, postulacionId: string) => {
    const current = solicitudes.find(item => item.id === solicitudId);
    if (!current) throw new Error(`No existe la solicitud ${solicitudId}`);
    await store.elegir(solicitudId, postulacionId);
    const updated: Solicitud = { ...current, estado: 'profesional_elegido', postulacionElegidaId: postulacionId };
    setSolicitudes(list => {
      const next = list.map(item => (item.id === solicitudId ? updated : item));
      persistir(REQUESTS_KEY, next);
      return next;
    });
    return updated;
  }, [solicitudes, persistir]);

  /** Cambia el estado de una solicitud y lo persiste, devolviendo la lista nueva. */
  const patchSolicitud = useCallback((solicitudId: string, estado: EstadoSolicitud) => {
    setSolicitudes(list => {
      const next = list.map(item => (item.id === solicitudId ? { ...item, estado } : item));
      persistir(REQUESTS_KEY, next);
      return next;
    });
  }, [persistir]);

  const guardarCotizaciones = useCallback((next: Cotizacion[]) => {
    persistir(QUOTES_KEY, next);
    setCotizaciones(next);
  }, [persistir]);

  const sendQuote = useCallback(async (input: CotizacionInput) => {
    const ahora = new Date().toISOString();
    const cotizacion: Cotizacion = {
      ...input,
      id: crypto.randomUUID(),
      estado: 'enviada',
      jobId: null,
      txHash: null,
      creadaEn: ahora,
      actualizadaEn: ahora,
    };
    const creada = await store.crearCotizacion(cotizacion);
    guardarCotizaciones([creada, ...cotizaciones]);
    patchSolicitud(input.solicitudId, 'cotizada');
    return creada;
  }, [cotizaciones, guardarCotizaciones, patchSolicitud]);

  const acceptQuote = useCallback(async (id: string, jobId: string, txHash: string) => {
    const actual = cotizaciones.find(item => item.id === id);
    if (!actual) throw new Error(`No existe la cotización ${id}`);
    if (store.remoto) await store.patchCotizacion(id, { estado: 'aceptada', jobId, txHash });
    const actualizada: Cotizacion = { ...actual, estado: 'aceptada', jobId, txHash, actualizadaEn: new Date().toISOString() };
    guardarCotizaciones(cotizaciones.map(item => (item.id === id ? actualizada : item)));
    patchSolicitud(actual.solicitudId, 'contratada');
    try {
      localStorage.removeItem(PENDING_ACCEPT_KEY);
    } catch {
      // Ídem.
    }
    return actualizada;
  }, [cotizaciones, guardarCotizaciones, patchSolicitud]);

  /** Rechazar devuelve la solicitud al profesional elegido para que vuelva a cotizar. */
  const rejectQuote = useCallback(async (id: string) => {
    const actual = cotizaciones.find(item => item.id === id);
    if (!actual) throw new Error(`No existe la cotización ${id}`);
    if (store.remoto) await store.patchCotizacion(id, { estado: 'rechazada' });
    const actualizada: Cotizacion = { ...actual, estado: 'rechazada', actualizadaEn: new Date().toISOString() };
    guardarCotizaciones(cotizaciones.map(item => (item.id === id ? actualizada : item)));
    patchSolicitud(actual.solicitudId, 'profesional_elegido');
    return actualizada;
  }, [cotizaciones, guardarCotizaciones, patchSolicitud]);

  const saveReview = useCallback((jobId: string, input: ResenaInput) => store.guardarResena(jobId, input), []);
  const readReview = useCallback((jobId: string) => store.leerResena(jobId), []);

  const setAvailable = useCallback((next: boolean) => {
    setAvailableState(next);
    write(AVAILABLE_KEY, next);
  }, []);

  const profile = session.client ? clientAccount : null;
  const providerProfile = session.provider ? providerAccount : null;

  const value = useMemo(
    () => ({ profile, clienteId, providerProfile, solicitudes, postulaciones, cotizaciones, available, saveProfile, saveProviderProfile, signInClient, signInProvider, signOut, publishRequest, sendProposal, chooseProposal, sendQuote, acceptQuote, rejectQuote, saveReview, readReview, syncError, retrySync, setAvailable }),
    [profile, clienteId, providerProfile, solicitudes, postulaciones, cotizaciones, available, saveProfile, saveProviderProfile, signInClient, signInProvider, signOut, publishRequest, sendProposal, chooseProposal, sendQuote, acceptQuote, rejectQuote, saveReview, readReview, syncError, retrySync, setAvailable],
  );
  return <DemoContext value={value}>{children}</DemoContext>;
}

export function useDemo(): DemoValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error('useDemo fuera de DemoProvider');
  return value;
}
