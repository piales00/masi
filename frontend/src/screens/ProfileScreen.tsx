import { ExternalLink, MapPin, Phone, RotateCcw, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDemo } from '../demo/DemoContext';

export function ProfileScreen() {
  const { profile, signOut } = useDemo();
  const navigate = useNavigate();

  /** Cierra solo la sesión de cliente: la cuenta y sus solicitudes siguen guardadas. */
  const restart = () => {
    signOut('client');
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

      {profile?.contractId && <section className="mt-6 rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <h3 className="text-sm font-bold text-masi-navy">Tu cuenta</h3>
        <p className="mt-1 text-xs text-masi-muted">
          Tus pagos y tus reseñas quedan registrados aquí, y cualquiera puede comprobarlos.
        </p>
        <p className="mt-2 font-mono text-xs break-all text-masi-text">{profile.contractId}</p>
        <a
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-masi-blue"
          href={`https://stellar.expert/explorer/testnet/contract/${profile.contractId}`}
          target="_blank"
          rel="noreferrer"
        >Ver detalles<ExternalLink size={15} aria-hidden="true" /></a>
      </section>}

      <Button variant="secondary" onClick={() => navigate('/recargar')} className="mt-6">
        <Wallet size={18} aria-hidden="true" />Recargar saldo
      </Button>

      <Button variant="secondary" onClick={restart} className="mt-3">
        <RotateCcw size={18} aria-hidden="true" />Cerrar sesión
      </Button>
    </div>
  </Screen>;
}
