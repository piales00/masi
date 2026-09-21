import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ArrowRight, Camera } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Field, fieldBox } from '../components/Field';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { cn } from '../cn';
import { createAccount, hasPendingAccount } from '../passkeys';
import { useDemo } from '../demo/DemoContext';
import type { Trade } from '../marketplace';
import { SERVICES, TINT_CLASSES } from '../trades';

const MAX_BIO = 200;

/** Zona inicial de MASI: distritos A y B. */
const DISTRICTS = ['Surco', 'Chorrillos', 'Barranco', 'Surquillo', 'Miraflores', 'San Isidro', 'San Borja'] as const;

export function ProviderSetupScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const existingContract = (location.state as { contractId?: string } | null)?.contractId;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(hasPendingAccount);
  const { saveProviderProfile } = useDemo();
  const [fullName, setFullName] = useState('');
  const [services, setServices] = useState<Trade[]>([]);
  const [district, setDistrict] = useState('');
  const [years, setYears] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // La vista previa es una URL de objeto: hay que liberarla al reemplazarla o al salir.
  const photoRef = useRef(photoUrl);
  photoRef.current = photoUrl;
  useEffect(() => () => { if (photoRef.current) URL.revokeObjectURL(photoRef.current); }, []);

  const pickPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setPhotoUrl(current => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  const toggleService = (id: Trade) => setServices(current => (
    current.includes(id) ? current.filter(service => service !== id) : [...current, id]
  ));

  const ready = Boolean(fullName.trim() && services.length > 0 && district && years !== '');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      const receipt = existingContract
        ? { contractId: existingContract, hash: undefined }
        : await createAccount(fullName.trim());
      saveProviderProfile({
        id: receipt.contractId,
        contractId: receipt.contractId,
        deploymentHash: receipt.hash,
        fullName: fullName.trim(),
        services,
        district,
        yearsExperience: Number(years),
        bio: bio.trim(),
        photoUrl: photoUrl || undefined,
      });
      navigate('/profesional', { replace: true });
    } catch (cause) {
      setPending(hasPendingAccount());
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar tu cuenta. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return <Screen header={<ScreenHeader title="Completa tu perfil" subtitle="Así te conocen los clientes de tu zona" />}>
    <form onSubmit={submit} className="space-y-6 px-4 py-6">
      <div className="flex flex-col items-center">
        {photoUrl
          ? <img src={photoUrl} alt="" className="size-20 rounded-full border border-masi-gray object-cover" />
          : <Avatar name={fullName || 'Nuevo profesional'} size="lg" />}
        <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-masi-gray bg-white px-4 text-sm font-semibold text-masi-blue transition-colors duration-200 ease-out hover:border-masi-blue">
          <Camera size={17} aria-hidden="true" />
          {photoUrl ? 'Cambiar foto' : 'Agregar foto'}
          <input type="file" accept="image/*" onChange={pickPhoto} className="sr-only" />
        </label>
      </div>

      <Field label="Nombre completo" value={fullName} onChange={event => setFullName(event.target.value)} autoComplete="name" placeholder="Ej. Juan Ramírez" required />

      <fieldset className="border-0 p-0">
        <legend className="text-sm font-semibold text-masi-navy">¿Qué servicios ofreces?</legend>
        <p className="mt-1 text-xs text-masi-muted">Puedes elegir más de uno.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SERVICES.map(({ id, name, icon: Icon, tint }) => {
            const active = services.includes(id);
            return <button
              key={id}
              type="button"
              onClick={() => toggleService(id)}
              aria-pressed={active}
              className={cn(
                'flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-200 ease-out',
                active ? 'border-masi-blue bg-masi-blue text-white' : 'border-masi-gray bg-white text-masi-navy hover:border-masi-blue',
              )}
            >
              <span className={cn('grid size-6 place-items-center rounded-full', active ? 'bg-white/20 text-white' : TINT_CLASSES[tint])}>
                <Icon size={14} aria-hidden="true" />
              </span>
              {name}
            </button>;
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-masi-navy">¿En qué distrito trabajas?</span>
        <select value={district} onChange={event => setDistrict(event.target.value)} required className={cn(fieldBox, 'h-12')}>
          <option value="">Elige tu distrito</option>
          {DISTRICTS.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>

      <Field
        label="Años de experiencia"
        type="number"
        inputMode="numeric"
        min={0}
        max={60}
        value={years}
        onChange={event => setYears(event.target.value)}
        placeholder="Ej. 8"
        required
      />

      <div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-masi-navy">Cuéntanos sobre tu trabajo <span className="font-normal text-masi-muted">(opcional)</span></span>
          <textarea
            value={bio}
            onChange={event => setBio(event.target.value.slice(0, MAX_BIO))}
            maxLength={MAX_BIO}
            rows={3}
            placeholder="Ej. Trabajo acabados de interiores con materiales de primera."
            className={cn(fieldBox, 'resize-none py-3')}
          />
        </label>
        <p className="mt-1.5 text-right text-xs text-masi-muted">{bio.length}/{MAX_BIO}</p>
      </div>

      {pending && !existingContract && <p className="rounded-masi-input bg-masi-cream p-3 text-sm text-masi-navy">Hay un registro pendiente. Reintenta con el mismo nombre.</p>}
      {error && <p role="alert" className="text-sm text-masi-error">{error}</p>}
      <Button type="submit" disabled={!ready || busy}>
        {busy ? 'Guardando…' : existingContract ? 'Guardar perfil' : pending ? 'Reintentar registro' : 'Crear cuenta con huella'}
        <ArrowRight size={18} aria-hidden="true" />
      </Button>
    </form>
  </Screen>;
}
