import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDemo } from '../demo/DemoContext';
import { createAccount, hasPendingAccount } from '../passkeys';

export function SetupScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get('rol') === 'profesional' ? 'profesional' : 'cliente';
  const { saveProfile } = useDemo();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(hasPendingAccount);

  const ready = Boolean(firstName.trim() && lastName.trim() && district.trim());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      const receipt = await createAccount(`${firstName.trim()} ${lastName.trim()}`);
      saveProfile({
        firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(),
        district: district.trim(), role, contractId: receipt.contractId,
        deploymentHash: receipt.hash,
      });
      navigate('/home', { replace: true });
    } catch (cause) {
      setPending(hasPendingAccount());
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return <Screen header={<ScreenHeader title="Cuéntanos un poco sobre ti" subtitle="Así te presentamos con los profesionales" />}>
    <form onSubmit={submit} className="space-y-4 px-4 py-6">
      <Field label="Nombre" value={firstName} onChange={event => setFirstName(event.target.value)} autoComplete="given-name" placeholder="Ej. María" required />
      <Field label="Apellido" value={lastName} onChange={event => setLastName(event.target.value)} autoComplete="family-name" placeholder="Ej. Torres" required />
      <Field label="Teléfono" type="tel" inputMode="tel" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" placeholder="Ej. 999 888 777" hint="Opcional. Solo para coordinar la visita." />
      <Field label="Distrito" value={district} onChange={event => setDistrict(event.target.value)} autoComplete="address-level2" placeholder="Ej. Chorrillos, Lima" required />
      <p className="flex items-start gap-2 rounded-masi-input bg-masi-blue-50 p-3 text-xs leading-relaxed text-masi-navy">
        <MapPin size={15} aria-hidden="true" className="mt-0.5" />
        <span>Usamos tu distrito para mostrarte a los profesionales más cercanos.</span>
      </p>
      {pending && <p className="rounded-masi-input bg-masi-cream p-3 text-sm text-masi-navy">Hay un registro pendiente. Reintenta con el mismo nombre para terminarlo sin crear otra cuenta.</p>}
      {error && <p role="alert" className="text-sm text-masi-error">{error}</p>}
      <Button type="submit" disabled={!ready || busy} className="!mt-6">
        {busy ? 'Registrando…' : pending ? 'Reintentar registro' : 'Crear cuenta con huella'}
        <ArrowRight size={18} aria-hidden="true" />
      </Button>
    </form>
  </Screen>;
}
