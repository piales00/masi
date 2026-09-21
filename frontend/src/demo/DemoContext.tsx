import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Trade } from '../marketplace';

export interface Profile {
  firstName: string;
  lastName: string;
  phone: string;
  district: string;
}

export interface ProviderProfile {
  id: string;
  fullName: string;
  services: Trade[];
  district: string;
  yearsExperience: number;
  bio: string;
  /** Vista previa local: no se guarda, así que tras recargar el avatar vuelve a las iniciales. */
  photoUrl?: string;
}

export type EstadoSolicitud = 'buscando_profesionales' | 'profesional_elegido';

export interface Solicitud {
  id: string;
  servicio: Trade;
  descripcion: string;
  /** Cuántas fotos adjuntó el cliente. Se dibujan como marcadores: no guardamos los archivos. */
  fotos: number;
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
    lastName: typeof row.lastName === 'string' ? row.lastName : '',
    phone: typeof row.phone === 'string' ? row.phone : '',
    district: typeof row.district === 'string' ? row.district : '',
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
  };
};

const parseSession = (value: unknown): Session | null => {
  const row = value as Partial<Session> | null;
  if (!row) return null;
  return { client: row.client === true, provider: row.provider === true };
};

const parseList = <T,>(value: unknown): T[] | null => (Array.isArray(value) ? value as T[] : null);

const ESTADOS: readonly EstadoSolicitud[] = ['buscando_profesionales', 'profesional_elegido'];

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
    estado: ESTADOS.includes(row.estado) ? row.estado : 'buscando_profesionales',
  }));
}

function migratePostulaciones(rows: Postulacion[]): Postulacion[] {
  return rows.map(row => ({
    ...row,
    providerNombre: typeof row.providerNombre === 'string' && row.providerNombre ? row.providerNombre : PROVIDER_FALLBACK_NAME,
  }));
}

interface DemoValue {
  profile: Profile | null;
  clienteId: string;
  providerProfile: ProviderProfile | null;
  solicitudes: Solicitud[];
  postulaciones: Postulacion[];
  available: boolean;
  saveProfile: (profile: Profile) => void;
  saveProviderProfile: (profile: ProviderProfile) => void;
  /** Reabre la cuenta guardada de ese rol; si no hay ninguna, usa la de ejemplo. */
  signInClient: (fallback: Profile) => void;
  signInProvider: (fallback: ProviderProfile) => void;
  signOut: (role: Role) => void;
  /** Async desde ya: en F5 solo cambia la implementación, no las pantallas. */
  publishRequest: (input: Omit<Solicitud, 'id' | 'estado' | 'creadaEn' | 'clienteId'>) => Promise<Solicitud>;
  sendProposal: (input: Omit<Postulacion, 'id' | 'fecha' | 'providerNombre'>) => Promise<Postulacion>;
  chooseProposal: (solicitudId: string, postulacionId: string) => Promise<Solicitud>;
  setAvailable: (next: boolean) => void;
}

const DemoContext = createContext<DemoValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [clientAccount, setClientAccount] = useState<Profile | null>(() => read(CLIENT_KEY, parseProfile));
  const [providerAccount, setProviderAccount] = useState<ProviderProfile | null>(() => read(PROVIDER_KEY, parseProviderProfile));
  const [session, setSession] = useState<Session>(() => read(SESSION_KEY, parseSession) ?? { client: false, provider: false });
  const [clienteId] = useState(readOrCreateClientId);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>(() => migrateSolicitudes(read(REQUESTS_KEY, parseList<Solicitud>) ?? [], clienteId));
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>(() => migratePostulaciones(read(PROPOSALS_KEY, parseList<Postulacion>) ?? []));
  const [available, setAvailableState] = useState<boolean>(() => read<boolean>(AVAILABLE_KEY, v => (typeof v === 'boolean' ? v : null)) ?? true);

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
    openSession('client');
  }, [openSession]);

  const saveProviderProfile = useCallback((next: ProviderProfile) => {
    setProviderAccount(next);
    // photoUrl queda fuera: es una URL de objeto que no sobrevive a la recarga.
    const { photoUrl: _photoUrl, ...persisted } = next;
    write(PROVIDER_KEY, persisted);
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
    setSolicitudes(current => {
      const next = [solicitud, ...current];
      write(REQUESTS_KEY, next);
      return next;
    });
    return solicitud;
  }, [clienteId]);

  const sendProposal = useCallback(async (input: Omit<Postulacion, 'id' | 'fecha' | 'providerNombre'>) => {
    const postulacion: Postulacion = {
      ...input,
      id: crypto.randomUUID(),
      providerNombre: providerAccount?.fullName?.trim() || PROVIDER_FALLBACK_NAME,
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
    setPostulaciones(current => {
      const next = [postulacion, ...current];
      write(PROPOSALS_KEY, next);
      return next;
    });
    return postulacion;
  }, [providerAccount]);

  const chooseProposal = useCallback(async (solicitudId: string, postulacionId: string) => {
    const current = solicitudes.find(item => item.id === solicitudId);
    if (!current) throw new Error(`No existe la solicitud ${solicitudId}`);
    const updated: Solicitud = { ...current, estado: 'profesional_elegido', postulacionElegidaId: postulacionId };
    setSolicitudes(list => {
      const next = list.map(item => (item.id === solicitudId ? updated : item));
      write(REQUESTS_KEY, next);
      return next;
    });
    return updated;
  }, [solicitudes]);

  const setAvailable = useCallback((next: boolean) => {
    setAvailableState(next);
    write(AVAILABLE_KEY, next);
  }, []);

  const profile = session.client ? clientAccount : null;
  const providerProfile = session.provider ? providerAccount : null;

  const value = useMemo(
    () => ({ profile, clienteId, providerProfile, solicitudes, postulaciones, available, saveProfile, saveProviderProfile, signInClient, signInProvider, signOut, publishRequest, sendProposal, chooseProposal, setAvailable }),
    [profile, clienteId, providerProfile, solicitudes, postulaciones, available, saveProfile, saveProviderProfile, signInClient, signInProvider, signOut, publishRequest, sendProposal, chooseProposal, setAvailable],
  );
  return <DemoContext value={value}>{children}</DemoContext>;
}

export function useDemo(): DemoValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error('useDemo fuera de DemoProvider');
  return value;
}
