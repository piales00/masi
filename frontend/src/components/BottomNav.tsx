import { CircleUser, ClipboardList, House } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TabId = 'inicio' | 'trabajos' | 'cuenta';

const TABS: readonly { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'inicio', label: 'Inicio', icon: House },
  { id: 'trabajos', label: 'Trabajos', icon: ClipboardList },
  { id: 'cuenta', label: 'Cuenta', icon: CircleUser },
];

export function BottomNav({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  return <nav className="bottom-nav" aria-label="Secciones de Masi">
    {TABS.map(({ id, label, icon: Icon }) => {
      const current = active === id;
      return <button key={id} className={current ? 'nav-tab nav-tab-active' : 'nav-tab'} aria-current={current ? 'page' : undefined} onClick={() => onChange(id)}>
        <Icon size={23} aria-hidden="true" />
        <span>{label}</span>
      </button>;
    })}
  </nav>;
}
