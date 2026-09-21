import { useState } from 'react';
import { ArrowRight, Fingerprint, LockKeyhole } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { MasiLogo } from '../components/MasiLogo';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { readProfileForAddress, readProviderForAddress, useDemo } from '../demo/DemoContext';
import { signIn } from '../passkeys';

export function AccessScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get('rol') === 'profesional' ? 'profesional' : 'cliente';
  const { saveProfile, saveProviderProfile } = useDemo();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const enter = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const contractId = await signIn();
      if (role === 'profesional') {
        const profile = readProviderForAddress(contractId);
        if (!profile) {
          navigate('/profesional/configuracion', { replace: true, state: { contractId } });
          return;
        }
        saveProviderProfile(profile);
        navigate('/profesional', { replace: true });
        return;
      }
      saveProfile(readProfileForAddress(contractId) ?? {
        firstName: 'Cuenta', lastName: '', phone: '', district: 'Lima', role, contractId,
      });
      navigate('/home', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo ingresar. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return <Screen header={<ScreenHeader title="Bienvenido a Masi" subtitle="Ingresa con tu llave de acceso" />}>
    <div className="px-4 py-6">
      <MasiLogo variant="app" className="mx-auto w-24" />
      <div className="mt-8 rounded-masi-card border border-masi-gray bg-white p-5 shadow-masi-sm">
        <span className="grid size-12 place-items-center rounded-2xl bg-masi-blue-50 text-masi-blue">
          <Fingerprint size={26} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-masi-navy">Entra con tu huella o el bloqueo de tu celular</h2>
        <p className="mt-2 text-sm text-masi-muted">Usa la llave de acceso que creaste para Masi. No necesitas contraseña.</p>
        <Button onClick={enter} disabled={busy} className="mt-6">
          <LockKeyhole size={18} aria-hidden="true" />{busy ? 'Verificando…' : 'Iniciar sesión'}
        </Button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-masi-input bg-masi-blue-50 p-3 text-sm text-masi-error">{error}</p>}

      <div className="mt-8 text-center">
        <p className="text-sm text-masi-muted">¿Primera vez en Masi?</p>
        <Button variant="secondary" className="mt-3" onClick={() => navigate(role === 'profesional' ? '/profesional/configuracion' : '/configuracion')}>
          Crear cuenta<ArrowRight size={18} aria-hidden="true" />
        </Button>
      </div>
    </div>
  </Screen>;
}
