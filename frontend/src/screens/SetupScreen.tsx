import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { ScreenFooter } from '../components/ScreenFooter';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDemo } from '../demo/DemoContext';

export function SetupScreen() {
  const navigate = useNavigate();
  const { saveProfile } = useDemo();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Chorrillos, Lima');

  const ready = Boolean(firstName.trim() && lastName.trim() && district.trim());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    saveProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), district: district.trim() });
    navigate('/home', { replace: true });
  };

  return <Screen
    header={<ScreenHeader title="Cuéntanos un poco sobre ti" subtitle="Así te presentamos con los profesionales" />}
    footer={<ScreenFooter className="border-t border-masi-gray bg-white">
      <Button type="submit" form="perfil" disabled={!ready}>Continuar<ArrowRight size={18} aria-hidden="true" /></Button>
    </ScreenFooter>}
  >
    <form id="perfil" onSubmit={submit} className="space-y-4 px-4 py-6">
      <Field label="Nombre" value={firstName} onChange={event => setFirstName(event.target.value)} autoComplete="given-name" placeholder="María" required />
      <Field label="Apellido" value={lastName} onChange={event => setLastName(event.target.value)} autoComplete="family-name" placeholder="Torres" required />
      <Field label="Teléfono" type="tel" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" placeholder="999 888 777" hint="Opcional. Solo para coordinar la visita." />
      <Field label="Distrito" value={district} onChange={event => setDistrict(event.target.value)} placeholder="Chorrillos, Lima" required />
      <p className="flex items-start gap-2 rounded-masi-input bg-masi-blue-50 p-3 text-xs leading-relaxed text-masi-navy">
        <MapPin size={15} aria-hidden="true" className="mt-0.5" />
        <span>Usamos tu distrito para mostrarte a los profesionales más cercanos.</span>
      </p>
    </form>
  </Screen>;
}
