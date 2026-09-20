import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { MasiLogo } from '../components/MasiLogo';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { cn } from '../cn';

type Mode = 'entrar' | 'crear';

function GoogleMark() {
  return <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5 shrink-0">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.7l7.8 6.1C12.3 13.9 17.6 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 7.1-10.2 7.1-17.6z" />
    <path fill="#FBBC05" d="M10.4 28.2c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16 0 19.9 0 23.5s.9 7.5 2.6 10.8l7.8-6.1z" />
    <path fill="#34A853" d="M24 47c6.2 0 11.5-2 15.4-5.6l-7.6-5.9c-2.1 1.4-4.8 2.3-7.8 2.3-6.4 0-11.7-4.4-13.6-10.3l-7.8 6.1C6.5 41.1 14.6 47 24 47z" />
  </svg>;
}

export function AccessScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('entrar');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    navigate('/configuracion');
  };

  return <Screen header={<ScreenHeader title="Bienvenido a Masi" subtitle="Entra o crea tu cuenta" />}>
    <form onSubmit={submit} className="px-4 py-6">
      <MasiLogo variant="app" className="mx-auto w-24" />

      <div role="tablist" aria-label="Entrar o crear cuenta" className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-masi-gray p-1">
        {([['entrar', 'Iniciar sesión'], ['crear', 'Crear cuenta']] as const).map(([id, label]) => <button
          key={id}
          role="tab"
          type="button"
          aria-selected={mode === id}
          onClick={() => setMode(id)}
          className={cn(
            'min-h-10 rounded-full px-3 text-sm font-semibold transition-colors duration-200 ease-out',
            mode === id ? 'bg-white text-masi-navy shadow-masi-sm' : 'text-masi-muted hover:text-masi-navy',
          )}
        >{label}</button>)}
      </div>

      <div className="mt-6 space-y-4">
        <Field label="Correo" type="email" name="email" autoComplete="email" placeholder="tucorreo@ejemplo.com" required />
        <Field
          label="Contraseña"
          type="password"
          name="password"
          autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
          placeholder="Mínimo 8 caracteres"
          minLength={8}
          required
          hint={mode === 'crear' ? 'Usa al menos 8 caracteres.' : undefined}
        />
      </div>

      <Button type="submit" className="mt-6">
        {mode === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}<ArrowRight size={18} aria-hidden="true" />
      </Button>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-masi-gray" />
        <span className="text-xs font-semibold text-masi-muted">o</span>
        <span className="h-px flex-1 bg-masi-gray" />
      </div>

      <Button variant="secondary" onClick={() => navigate('/configuracion')}>
        <GoogleMark />Continuar con Google
      </Button>

      <p className="mt-6 flex items-start gap-2 rounded-masi-input bg-masi-blue-50 p-3 text-xs leading-relaxed text-masi-navy">
        <Lock size={15} aria-hidden="true" className="mt-0.5" />
        <span>Esta es una demostración: no se envía ni se guarda ninguna contraseña.</span>
      </p>
      <p className="mt-3 flex items-center justify-center gap-2 text-xs text-masi-muted">
        <Mail size={14} aria-hidden="true" />Te escribiremos solo por tus solicitudes.
      </p>
    </form>
  </Screen>;
}
