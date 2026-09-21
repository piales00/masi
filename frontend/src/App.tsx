import type { ReactElement } from 'react';
import { Activity, ClipboardList } from 'lucide-react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthLayout } from './components/AuthLayout';
import { PROVIDER_NAV } from './components/MainNav';
import { useDemo } from './demo/DemoContext';
import { AccessScreen } from './screens/AccessScreen';
import { HomeScreen } from './screens/HomeScreen';
import { NewRequestScreen } from './screens/NewRequestScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ProviderActivityScreen } from './screens/ProviderActivityScreen';
import { ProviderAlertScreen } from './screens/ProviderAlertScreen';
import { ProviderHomeScreen } from './screens/ProviderHomeScreen';
import { ProviderProfileScreen } from './screens/ProviderProfileScreen';
import { ProviderSetupScreen } from './screens/ProviderSetupScreen';
import { ProvidersScreen } from './screens/ProvidersScreen';
import { RoleScreen } from './screens/RoleScreen';
import { SetupScreen } from './screens/SetupScreen';
import { SoonScreen } from './screens/SoonScreen';
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
      <Route path="profesional/actividad" element={<ProviderActivityScreen />} />
      <Route path="profesional/perfil" element={<ProviderProfileScreen />} />
    </Route>

    <Route element={<RequireProfile><AppShell /></RequireProfile>}>
      <Route path="home" element={<HomeScreen />} />
      <Route path="solicitudes" element={<SoonScreen title="Solicitudes" icon={ClipboardList} text="Aquí seguirás cada trabajo que solicites, desde que lo pides hasta que lo apruebas." />} />
      <Route path="solicitudes/nueva" element={<NewRequestScreen />} />
      <Route path="profesionales" element={<ProvidersScreen />} />
      <Route path="actividad" element={<SoonScreen title="Actividad" icon={Activity} text="Aquí verás el detalle de cada pago y cada paso de tus trabajos." />} />
      <Route path="perfil" element={<ProfileScreen />} />
    </Route>

    <Route path="*" element={<Navigate to="/splash" replace />} />
  </Routes>;
}
