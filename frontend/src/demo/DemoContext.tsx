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

export interface Solicitud {
  id: string;
  servicio: Trade;
  descripcion: string;
  /** Cuántas fotos adjuntó el cliente. Se dibujan como marcadores: no guardamos los archivos. */
  fotos: number;
  ubicacion: string;
  distrito: string;
  cliente: string;
  estado: 'buscando_profesionales';
  creadaEn: string;
}

export interface Postulacion {
  id: string;
  solicitudId: string;
  providerId: string;
  precio: number;
  minutos: number;
  fecha: string;
}

export type Role = 'client' | 'provider';

/**
 * Cuatro cajones separados. Las cuentas quedan guardadas aunque se cierre sesión, y
 * las solicitudes y postulaciones son datos compartidos entre los dos roles: nunca se
 * borran al salir, o el cliente publicaría algo que el profesional jamás vería.
 */
const CLIENT_KEY = 'masi.demo.cliente.v2';
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

interface DemoValue {
  profile: Profile | null;
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
  publishRequest: (input: Omit<Solicitud, 'id' | 'estado' | 'creadaEn'>) => Solicitud;
  sendProposal: (input: Omit<Postulacion, 'id' | 'fecha'>) => Postulacion;
  setAvailable: (next: boolean) => void;
}

const DemoContext = createContext<DemoValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [clientAccount, setClientAccount] = useState<Profile | null>(() => read(CLIENT_KEY, parseProfile));
  const [providerAccount, setProviderAccount] = useState<ProviderProfile | null>(() => read(PROVIDER_KEY, parseProviderProfile));
  const [session, setSession] = useState<Session>(() => read(SESSION_KEY, parseSession) ?? { client: false, provider: false });
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>(() => read(REQUESTS_KEY, parseList<Solicitud>) ?? []);
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>(() => read(PROPOSALS_KEY, parseList<Postulacion>) ?? []);
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

  const publishRequest = useCallback((input: Omit<Solicitud, 'id' | 'estado' | 'creadaEn'>) => {
    const solicitud: Solicitud = { ...input, id: crypto.randomUUID(), estado: 'buscando_profesionales', creadaEn: new Date().toISOString() };
    setSolicitudes(current => {
      const next = [solicitud, ...current];
      write(REQUESTS_KEY, next);
      return next;
    });
    return solicitud;
  }, []);

  const sendProposal = useCallback((input: Omit<Postulacion, 'id' | 'fecha'>) => {
    const postulacion: Postulacion = { ...input, id: crypto.randomUUID(), fecha: new Date().toISOString() };
    setPostulaciones(current => {
      const next = [postulacion, ...current];
      write(PROPOSALS_KEY, next);
      return next;
    });
    return postulacion;
  }, []);

  const setAvailable = useCallback((next: boolean) => {
    setAvailableState(next);
    write(AVAILABLE_KEY, next);
  }, []);

  const profile = session.client ? clientAccount : null;
  const providerProfile = session.provider ? providerAccount : null;

  const value = useMemo(
    () => ({ profile, providerProfile, solicitudes, postulaciones, available, saveProfile, saveProviderProfile, signInClient, signInProvider, signOut, publishRequest, sendProposal, setAvailable }),
    [profile, providerProfile, solicitudes, postulaciones, available, saveProfile, saveProviderProfile, signInClient, signInProvider, signOut, publishRequest, sendProposal, setAvailable],
  );
  return <DemoContext value={value}>{children}</DemoContext>;
}

export function useDemo(): DemoValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error('useDemo fuera de DemoProvider');
  return value;
}
