import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

// Pedir y verificar UV: una presencia simple sin desbloqueo no basta.
export const verifiedWebAuthn = {
  startAuthentication(args: Parameters<typeof startAuthentication>[0]) {
    return startAuthentication({ ...args, optionsJSON: { ...args.optionsJSON, userVerification: 'required' } });
  },
  startRegistration(args: Parameters<typeof startRegistration>[0]) {
    return startRegistration({ ...args, optionsJSON: {
      ...args.optionsJSON,
      authenticatorSelection: { ...args.optionsJSON.authenticatorSelection, residentKey: 'required', userVerification: 'required' },
    } });
  },
};
