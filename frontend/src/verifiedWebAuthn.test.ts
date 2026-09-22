import { expect, it, vi } from 'vitest';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { verifiedWebAuthn } from './verifiedWebAuthn';

vi.mock('@simplewebauthn/browser', () => ({ startAuthentication: vi.fn(), startRegistration: vi.fn() }));

it('exige desbloqueo y conserva el challenge de autenticación', async () => {
  await verifiedWebAuthn.startAuthentication({ optionsJSON: { challenge: 'fresh-challenge', userVerification: 'preferred' } });
  expect(startAuthentication).toHaveBeenCalledWith({ optionsJSON: { challenge: 'fresh-challenge', userVerification: 'required' } });
});

it('exige verificación y una llave descubrible al registrar', async () => {
  await verifiedWebAuthn.startRegistration({ optionsJSON: {
    challenge: 'registration-challenge', rp: { name: 'Masi' },
    user: { id: 'id', name: 'Prueba', displayName: 'Prueba' }, pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
  } });
  expect(vi.mocked(startRegistration).mock.calls[0][0].optionsJSON.authenticatorSelection).toEqual({ residentKey: 'required', userVerification: 'required' });
});
