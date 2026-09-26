import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

/**
 * En una computadora sin lector de huella, el registro falla con el error crudo del
 * navegador («NotAllowedError…»), que no le dice nada a nadie. Este aviso lo adelanta.
 *
 * Falla abierto a propósito: si la consulta no existe, tarda o revienta, no se muestra
 * nada. Vale más que un equipo compatible no vea el aviso a que uno que sí funciona se
 * asuste y no lo intente.
 */
export function AvisoSinHuella() {
  const [sinHuella, setSinHuella] = useState(false);

  useEffect(() => {
    let vigente = true;
    const disponible = globalThis.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable;
    if (typeof disponible !== 'function') return;
    Promise.resolve(disponible.call(globalThis.PublicKeyCredential))
      .then(hay => { if (vigente && hay === false) setSinHuella(true); })
      .catch(() => { /* Sin respuesta, no se avisa. */ });
    return () => { vigente = false; };
  }, []);

  if (!sinHuella) return null;

  return <p role="status" className="flex items-start gap-2 rounded-masi-input bg-masi-cream p-3 text-sm leading-relaxed text-masi-navy">
    <Smartphone size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-masi-orange" />
    <span>Tu computadora no tiene lector de huella. Abre Masi en tu celular para crear la cuenta.</span>
  </p>;
}
