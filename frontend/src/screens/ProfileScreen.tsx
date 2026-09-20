import { MapPin, Phone, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDemo } from '../demo/DemoContext';

export function ProfileScreen() {
  const { profile, reset } = useDemo();
  const navigate = useNavigate();

  /** Sin perfil, RequireProfile ya manda a /bienvenida, así que basta con limpiar e ir allí. */
  const restart = () => {
    reset();
    navigate('/bienvenida', { replace: true });
  };

  return <Screen header={<ScreenHeader title="Perfil" back={false} />}>
    <div className="px-4 py-6">
      <div className="flex items-center gap-4 rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <Avatar name={`${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-masi-navy">{profile?.firstName} {profile?.lastName}</h2>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-masi-muted">
            <MapPin size={14} aria-hidden="true" />{profile?.district}
          </p>
          {profile?.phone && <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-masi-muted">
            <Phone size={14} aria-hidden="true" />{profile.phone}
          </p>}
        </div>
      </div>

      <Button variant="secondary" onClick={restart} className="mt-6">
        <RotateCcw size={18} aria-hidden="true" />Cerrar sesión
      </Button>
    </div>
  </Screen>;
}
