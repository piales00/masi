import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface Profile {
  firstName: string;
  lastName: string;
  phone: string;
  district: string;
}

const STORAGE_KEY = 'masi.demo.v1';

/** Quien inicia sesión ya tenía cuenta, así que entra con su perfil listo. */
export const RETURNING_PROFILE: Profile = {
  firstName: 'María',
  lastName: 'Torres',
  phone: '999 888 777',
  district: 'Chorrillos, Lima',
};

/** Survives a reload so deep links like /solicitud/:id keep working. */
function readProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Profile> | null;
    if (!value || typeof value.firstName !== 'string' || !value.firstName.trim()) return null;
    return {
      firstName: value.firstName,
      lastName: typeof value.lastName === 'string' ? value.lastName : '',
      phone: typeof value.phone === 'string' ? value.phone : '',
      district: typeof value.district === 'string' ? value.district : '',
    };
  } catch {
    return null;
  }
}

interface DemoValue {
  profile: Profile | null;
  saveProfile: (profile: Profile) => void;
  reset: () => void;
}

const DemoContext = createContext<DemoValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(readProfile);

  const saveProfile = useCallback((next: Profile) => {
    setProfile(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Sin almacenamiento la demo sigue funcionando; solo no sobrevive a una recarga.
    }
  }, []);

  const reset = useCallback(() => {
    setProfile(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ídem.
    }
  }, []);

  const value = useMemo(() => ({ profile, saveProfile, reset }), [profile, saveProfile, reset]);
  return <DemoContext value={value}>{children}</DemoContext>;
}

export function useDemo(): DemoValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error('useDemo fuera de DemoProvider');
  return value;
}
