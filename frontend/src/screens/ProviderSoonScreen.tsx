import { ArrowLeft, HardHat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenFooter } from '../components/ScreenFooter';
import { ScreenHeader } from '../components/ScreenHeader';

export function ProviderSoonScreen() {
  const navigate = useNavigate();

  return <Screen
    header={<ScreenHeader title="Para profesionales" />}
    footer={<ScreenFooter className="bg-white">
      <Button variant="secondary" onClick={() => navigate('/rol', { replace: true })}>
        <ArrowLeft size={18} aria-hidden="true" />Volver a elegir
      </Button>
    </ScreenFooter>}
  >
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-10 text-center">
      <span className="grid size-20 place-items-center rounded-3xl bg-masi-orange-50 text-masi-navy"><HardHat size={36} aria-hidden="true" /></span>
      <h2 className="mt-6 text-2xl font-bold text-masi-navy">Estamos preparando el espacio para profesionales</h2>
      <p className="mt-3 text-base text-masi-muted">
        Muy pronto vas a poder recibir solicitudes de tu zona y cobrar con el pago protegido de Masi.
      </p>
    </div>
  </Screen>;
}
