import { Briefcase, LogOut, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { AccountDetails } from '../components/AccountDetails';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDemo } from '../demo/DemoContext';

export function ProviderProfileScreen() {
  const { providerProfile, signOut } = useDemo();
  const navigate = useNavigate();

  /** Cierra solo la sesión de profesional: no toca la del cliente ni los datos compartidos. */
  const leave = () => {
    signOut('provider');
    navigate('/bienvenida', { replace: true });
  };

  const years = providerProfile?.yearsExperience ?? 0;

  return <Screen header={<ScreenHeader title="Perfil" back={false} />}>
    <div className="px-4 py-6">
      <div className="rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <div className="flex items-center gap-4">
          {providerProfile?.photoUrl
            ? <img src={providerProfile.photoUrl} alt="" className="size-16 shrink-0 rounded-full border border-masi-gray object-cover" />
            : <Avatar name={providerProfile?.fullName ?? ''} size="lg" />}
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-masi-navy">{providerProfile?.fullName}</h2>
            <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-masi-muted">
              <MapPin size={14} aria-hidden="true" />{providerProfile?.district}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-masi-muted">
              <Briefcase size={14} aria-hidden="true" />{years} {years === 1 ? 'año' : 'años'} de experiencia
            </p>
          </div>
        </div>

        {providerProfile?.services.length ? <div className="mt-4 border-t border-masi-gray pt-3">
          <h3 className="text-sm font-semibold text-masi-navy">Servicios que ofreces</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {providerProfile.services.map(service => <li key={service} className="rounded-full bg-masi-blue-50 px-3 py-1 text-xs font-semibold text-masi-navy">{service}</li>)}
          </ul>
        </div> : null}

        {providerProfile?.bio ? <div className="mt-4 border-t border-masi-gray pt-3">
          <h3 className="text-sm font-semibold text-masi-navy">Sobre tu trabajo</h3>
          <p className="mt-2 text-sm leading-relaxed text-masi-text">{providerProfile.bio}</p>
        </div> : null}
      </div>

      <AccountDetails contractId={providerProfile?.contractId} deploymentHash={providerProfile?.deploymentHash} />
      <Button variant="secondary" onClick={leave} className="mt-6">
        <LogOut size={18} aria-hidden="true" />Cerrar sesión
      </Button>
    </div>
  </Screen>;
}
