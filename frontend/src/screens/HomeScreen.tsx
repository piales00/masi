import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Bell, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { fieldBox } from '../components/Field';
import { Screen } from '../components/Screen';
import { AccountDetails } from '../components/AccountDetails';
import { cn } from '../cn';
import { useDemo } from '../demo/DemoContext';
import type { Trade } from '../marketplace';
import { SERVICES, TINT_CLASSES } from '../trades';

const MAX_CHARS = 300;

const STEPS = [
  { title: 'Cuéntanos qué necesitas', text: 'Describe el problema en pocas palabras.' },
  { title: 'Encuentra profesionales', text: 'Recibes opciones de tu zona para comparar.' },
  { title: 'Contrata con tranquilidad', text: 'Acuerdas el trabajo y sigues cada paso.' },
];

export function HomeScreen() {
  const { profile } = useDemo();
  const navigate = useNavigate();
  const [need, setNeed] = useState('');

  const describe = (event: FormEvent) => {
    event.preventDefault();
    if (!need.trim()) return;
    navigate('/solicitudes/nueva', { state: { description: need.trim() } });
  };

  const pickService = (trade: Trade) => navigate('/solicitudes/nueva', { state: { trade } });

  return <Screen header={
    <header className="shrink-0 border-b border-masi-gray bg-white px-4 pt-[calc(0.75rem+var(--masi-safe-top))] pb-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl leading-tight font-bold text-masi-navy">Hola, {profile?.firstName}</h1>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-masi-muted">
            <MapPin size={13} aria-hidden="true" />{profile?.district}
          </p>
        </div>
        <button
          aria-label="Notificaciones"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-masi-bg text-masi-navy transition-colors duration-200 ease-out hover:bg-masi-blue-50"
        ><Bell size={20} aria-hidden="true" /></button>
      </div>
    </header>
  }>
    <div className="px-4 py-6">
      <form onSubmit={describe}>
        <label className="block">
          <span className="block text-2xl leading-tight font-bold text-masi-navy">¿Qué necesitas resolver hoy?</span>
          <textarea
            value={need}
            onChange={event => setNeed(event.target.value.slice(0, MAX_CHARS))}
            maxLength={MAX_CHARS}
            rows={3}
            placeholder="Ej. Se malogró la chapa de mi puerta y no puedo cerrar bien."
            className={cn(fieldBox, 'mt-4 resize-none py-3')}
          />
        </label>
        <Button type="submit" disabled={!need.trim()} className="mt-3 sm:w-auto sm:self-start">
          Contar mi problema<ArrowRight size={18} aria-hidden="true" />
        </Button>
      </form>

      <section className="mt-8" aria-labelledby="servicios">
        <h2 id="servicios" className="text-sm font-semibold text-masi-navy">O elige un servicio</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SERVICES.map(({ id, name, icon: Icon, tint }) => <button
            key={id}
            onClick={() => pickService(id)}
            className="flex flex-col items-center gap-2 rounded-masi-card border border-masi-gray bg-white p-3 text-center shadow-masi-sm transition-colors duration-200 ease-out hover:border-masi-blue"
          >
            <span className={cn('grid size-12 place-items-center rounded-2xl', TINT_CLASSES[tint])}>
              <Icon size={22} aria-hidden="true" />
            </span>
            <span className="text-xs leading-tight font-semibold text-masi-navy">{name}</span>
          </button>)}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="como-funciona">
        <h2 id="como-funciona" className="text-sm font-semibold text-masi-navy">¿Cómo funciona Masi?</h2>
        <ol className="mt-3 grid gap-2 sm:grid-cols-3">
          {STEPS.map(({ title, text }, index) => <li key={title} className="flex items-start gap-3 rounded-masi-input border border-masi-gray bg-white p-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-masi-blue-50 text-xs font-bold text-masi-blue">{index + 1}</span>
            <span className="min-w-0">
              <span className="block text-sm leading-tight font-semibold text-masi-navy">{title}</span>
              <span className="mt-1 block text-xs text-masi-muted">{text}</span>
            </span>
          </li>)}
        </ol>
      </section>
      <AccountDetails contractId={profile?.contractId} deploymentHash={profile?.deploymentHash} />
    </div>
  </Screen>;
}
