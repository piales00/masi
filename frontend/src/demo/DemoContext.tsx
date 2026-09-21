import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface Profile {
  firstName: string;
  lastName: string;
  phone: string;
  district: string;
  role?: 'cliente' | 'profesional';
  contractId?: string;
  deploymentHash?: string;
}

const STORAGE_KEY = 'masi.demo.v1';

/** Survives a reload so deep links like /solicitud/:id keep working. */
function readProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Profile> | null;
    if (!value || typeof value.firstName !== 'string' || !value.firstName.trim() ||
        typeof value.contractId !== 'string' || !value.contractId.startsWith('C')) return null;
    return {
      firstName: value.firstName,
      lastName: typeof value.lastName === 'string' ? value.lastName : '',
      phone: typeof value.phone === 'string' ? value.phone : '',
      district: typeof value.district === 'string' ? value.district : '',
      role: value.role === 'profesional' ? 'profesional' : 'cliente',
      contractId: typeof value.contractId === 'string' ? value.contractId : undefined,
      deploymentHash: typeof value.deploymentHash === 'string' ? value.deploymentHash : undefined,
    };
  } catch {
    return null;
  }
}

export function readProfileForAddress(contractId: string): Profile | null {
  try {
    const raw = localStorage.getItem(`masi.profile.${contractId}`);
    if (!raw) return null;
    const value = JSON.parse(raw) as Profile;
    return value.contractId === contractId && typeof value.firstName === 'string' ? value : null;
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
      if (next.contractId) localStorage.setItem(`masi.profile.${next.contractId}`, JSON.stringify(next));
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
