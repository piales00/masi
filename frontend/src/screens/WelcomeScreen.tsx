import { ArrowRight, Clock3, MapPin, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { MasiLogo } from '../components/MasiLogo';
import { Screen } from '../components/Screen';
import { ScreenFooter } from '../components/ScreenFooter';

const PROMISES = [
  { icon: ShieldCheck, text: 'Profesionales de confianza' },
  { icon: Clock3, text: 'Ayuda en minutos' },
  { icon: MapPin, text: 'En tu distrito' },
];

export function WelcomeScreen() {
  const navigate = useNavigate();

  return <Screen footer={
    <ScreenFooter className="bg-white">
      <Button onClick={() => navigate('/rol')}>Comenzar<ArrowRight size={18} aria-hidden="true" /></Button>
      <p className="mt-3 text-center text-sm text-masi-muted">
        ¿Ya tienes cuenta?{' '}
        <button onClick={() => navigate('/acceso')} className="font-semibold text-masi-blue underline-offset-4 hover:underline">Inicia sesión</button>
      </p>
    </ScreenFooter>
  }>
    <div className="flex min-h-full flex-col justify-center bg-linear-135 from-masi-bg to-masi-blue-50 px-6 pt-[calc(1.5rem+var(--masi-safe-top))] pb-6">
      <MasiLogo variant="app" className="mx-auto w-24 max-w-[38%]" />
      <h1 className="mt-5 text-center text-[28px] leading-tight font-extrabold tracking-tight text-masi-navy">
        Tu hogar en<br />buenas manos
      </h1>
      <span className="mx-auto mt-4 block h-1 w-14 rounded-full bg-masi-orange" />
      <p className="mt-4 text-center text-base text-masi-text">
        Encuentra a quien sabe hacerlo y paga con tranquilidad: tu dinero queda protegido hasta que el trabajo esté listo.
      </p>
      <ul className="mt-5 space-y-2">
        {PROMISES.map(({ icon: Icon, text }) => <li key={text} className="flex items-center gap-3 rounded-masi-card border border-masi-gray bg-white px-4 py-2.5 shadow-masi-sm">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-masi-blue-50 text-masi-blue"><Icon size={19} aria-hidden="true" /></span>
          <span className="text-sm font-semibold text-masi-navy">{text}</span>
        </li>)}
      </ul>
    </div>
  </Screen>;
}
