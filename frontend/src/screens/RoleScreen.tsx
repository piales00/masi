import { useState } from 'react';
import { ArrowRight, Check, HardHat, House } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenFooter } from '../components/ScreenFooter';
import { ScreenHeader } from '../components/ScreenHeader';
import { cn } from '../cn';

type Role = 'cliente' | 'profesional';

const ROLES = [
  { id: 'cliente' as const, icon: House, title: 'Necesito un servicio', text: 'Busca profesionales cerca de ti y paga con tu dinero protegido.' },
  { id: 'profesional' as const, icon: HardHat, title: 'Ofrezco mis servicios', text: 'Recibe solicitudes de tu zona y cobra sin sorpresas.' },
];

export function RoleScreen() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);

  return <Screen
    header={<ScreenHeader title="¿Cómo quieres usar Masi?" subtitle="Puedes cambiarlo después" />}
    footer={<ScreenFooter className="bg-white">
      <Button disabled={!role} onClick={() => navigate(role === 'cliente' ? '/acceso' : '/acceso?rol=profesional')}>
        Continuar<ArrowRight size={18} aria-hidden="true" />
      </Button>
    </ScreenFooter>}
  >
    <div className="space-y-4 px-4 py-6">
      {ROLES.map(({ id, icon: Icon, title, text }) => {
        const selected = role === id;
        return <button
          key={id}
          onClick={() => setRole(id)}
          aria-pressed={selected}
          className={cn(
            'flex w-full items-start gap-4 rounded-masi-card border bg-white p-4 text-left transition-colors duration-200 ease-out',
            selected ? 'border-masi-blue shadow-masi-md' : 'border-masi-gray shadow-masi-sm hover:border-masi-blue',
          )}
        >
          <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', selected ? 'bg-masi-blue text-white' : 'bg-masi-blue-50 text-masi-blue')}>
            <Icon size={24} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-masi-navy">{title}</span>
            <span className="mt-1 block text-sm text-masi-muted">{text}</span>
          </span>
          <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border-2', selected ? 'border-masi-blue bg-masi-blue text-white' : 'border-masi-gray')}>
            {selected && <Check size={14} aria-hidden="true" />}
          </span>
        </button>;
      })}
    </div>
  </Screen>;
}
