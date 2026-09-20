import { Bell, MapPin, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { useDemo } from '../demo/DemoContext';

export function HomeScreen() {
  const { profile, reset } = useDemo();
  const navigate = useNavigate();

  /**
   * Provisional aquí hasta que exista la pestaña Perfil. Va a /bienvenida y no a /splash
   * porque al quedarse sin perfil RequireProfile redirige ahí de todos modos.
   */
  const restart = () => {
    reset();
    navigate('/bienvenida', { replace: true });
  };

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
      <h2 className="text-2xl leading-tight font-bold text-masi-navy">¿Qué necesitas resolver hoy?</h2>
      <button
        onClick={restart}
        className="mt-8 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-masi-blue transition-colors duration-200 ease-out hover:bg-masi-blue-50"
      ><RotateCcw size={16} aria-hidden="true" />Reiniciar demo</button>
    </div>
  </Screen>;
}
