import type { ReactElement } from 'react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthLayout } from './components/AuthLayout';
import { PROVIDER_NAV } from './components/MainNav';
import { useDemo } from './demo/DemoContext';
import { AccessScreen } from './screens/AccessScreen';
import { ActivityScreen } from './screens/ActivityScreen';
import { ArbitrationScreen } from './screens/ArbitrationScreen';
import { HomeScreen } from './screens/HomeScreen';
import { JobScreen } from './screens/JobScreen';
import { NewRequestScreen } from './screens/NewRequestScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ProviderActivityScreen } from './screens/ProviderActivityScreen';
import { ProviderAlertScreen } from './screens/ProviderAlertScreen';
import { ProviderHomeScreen } from './screens/ProviderHomeScreen';
import { ProviderProfileScreen } from './screens/ProviderProfileScreen';
import { WithdrawScreen } from './screens/WithdrawScreen';
import { ProviderQuoteScreen } from './screens/ProviderQuoteScreen';
import { ProviderSetupScreen } from './screens/ProviderSetupScreen';
import { ProposalDetailScreen } from './screens/ProposalDetailScreen';
import { ProvidersScreen } from './screens/ProvidersScreen';
import { RequestDetailScreen } from './screens/RequestDetailScreen';
import { RechargeScreen } from './screens/RechargeScreen';
import { RequestsScreen } from './screens/RequestsScreen';
import { RoleScreen } from './screens/RoleScreen';
import { SetupScreen } from './screens/SetupScreen';
import { SplashScreen } from './screens/SplashScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';

function RequireProfile({ children }: { children: ReactElement }) {
  const { profile } = useDemo();
  return profile ? children : <Navigate to="/bienvenida" replace />;
}

function RequireProviderProfile({ children }: { children: ReactElement }) {
  const { providerProfile } = useDemo();
  return providerProfile ? children : <Navigate to="/bienvenida" replace />;
}

/**
 * Con la cuenta ya creada, volver atrás hasta un formulario de acceso devuelve al
 * destino del rol. En /acceso el rol llega por query param; en los setup es fijo.
 */
function SkipIfSignedIn({ role, children }: { role?: 'client' | 'provider'; children: ReactElement }) {
  const { profile, providerProfile } = useDemo();
  const [params] = useSearchParams();
  const resolved = role ?? (params.get('rol') === 'profesional' ? 'provider' : 'client');

  if (resolved === 'provider') return providerProfile ? <Navigate to="/profesional" replace /> : children;
  return profile ? <Navigate to="/home" replace /> : children;
}

export function App() {
  return <Routes>
    <Route element={<AuthLayout />}>
      <Route index element={<Navigate to="/splash" replace />} />
      <Route path="splash" element={<SplashScreen />} />
      <Route path="bienvenida" element={<WelcomeScreen />} />
      <Route path="rol" element={<RoleScreen />} />
      <Route path="acceso" element={<SkipIfSignedIn><AccessScreen /></SkipIfSignedIn>} />
      <Route path="configuracion" element={<SkipIfSignedIn role="client"><SetupScreen /></SkipIfSignedIn>} />
      <Route path="profesional/configuracion" element={<SkipIfSignedIn role="provider"><ProviderSetupScreen /></SkipIfSignedIn>} />
    </Route>

    <Route element={<RequireProviderProfile><AppShell items={PROVIDER_NAV} /></RequireProviderProfile>}>
      <Route path="profesional" element={<ProviderHomeScreen />} />
      <Route path="profesional/alertas/:id" element={<ProviderAlertScreen />} />
      <Route path="profesional/cotizacion/:solicitudId" element={<ProviderQuoteScreen />} />
      {/* Solicitudes es la bandeja operativa; Actividad queda para el historial de F4. */}
      <Route path="profesional/solicitudes" element={<ProviderActivityScreen />} />
      <Route path="profesional/trabajos/:jobId" element={<JobScreen role="provider" />} />
      <Route path="profesional/actividad" element={<ActivityScreen role="provider" />} />
      <Route path="profesional/perfil" element={<ProviderProfileScreen />} />
      <Route path="profesional/retirar" element={<WithdrawScreen />} />
    </Route>

    <Route element={<RequireProfile><AppShell /></RequireProfile>}>
      <Route path="home" element={<HomeScreen />} />
      <Route path="solicitudes" element={<RequestsScreen />} />
      <Route path="solicitudes/nueva" element={<NewRequestScreen />} />
      <Route path="solicitudes/:id" element={<RequestDetailScreen />} />
      <Route path="solicitudes/:id/propuesta/:postulacionId" element={<ProposalDetailScreen />} />
      <Route path="profesionales" element={<ProvidersScreen />} />
      {/* Actividad es el historial; lo que sigue en curso vive en Solicitudes. */}
      <Route path="actividad" element={<ActivityScreen role="client" />} />
      <Route path="recargar" element={<RechargeScreen />} />
      <Route path="perfil" element={<ProfileScreen />} />
      <Route path="trabajos/:jobId" element={<JobScreen role="client" />} />
    </Route>

    {/*
      * Panel interno del árbitro: sin navegación y sin enlace desde ninguna pantalla.
      * No pide perfil porque no es un rol de la app; su puerta es la clave del panel.
      */}
    <Route element={<AuthLayout />}>
      <Route path="arbitraje" element={<ArbitrationScreen />} />
    </Route>

    <Route path="*" element={<Navigate to="/splash" replace />} />
  </Routes>;
}
