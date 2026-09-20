import type { ReactElement } from 'react';
import { Activity, ClipboardList } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthLayout } from './components/AuthLayout';
import { useDemo } from './demo/DemoContext';
import { AccessScreen } from './screens/AccessScreen';
import { HomeScreen } from './screens/HomeScreen';
import { NewRequestScreen } from './screens/NewRequestScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ProvidersScreen } from './screens/ProvidersScreen';
import { ProviderSoonScreen } from './screens/ProviderSoonScreen';
import { RoleScreen } from './screens/RoleScreen';
import { SetupScreen } from './screens/SetupScreen';
import { SoonScreen } from './screens/SoonScreen';
import { SplashScreen } from './screens/SplashScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';

function RequireProfile({ children }: { children: ReactElement }) {
  const { profile } = useDemo();
  return profile ? children : <Navigate to="/bienvenida" replace />;
}

/** Con perfil ya creado, volver atrás hasta un formulario de acceso devuelve a /home. */
function SkipIfProfile({ children }: { children: ReactElement }) {
  const { profile } = useDemo();
  return profile ? <Navigate to="/home" replace /> : children;
}

export function App() {
  return <Routes>
    <Route element={<AuthLayout />}>
      <Route index element={<Navigate to="/splash" replace />} />
      <Route path="splash" element={<SplashScreen />} />
      <Route path="bienvenida" element={<WelcomeScreen />} />
      <Route path="rol" element={<RoleScreen />} />
      <Route path="rol/profesional" element={<ProviderSoonScreen />} />
      <Route path="acceso" element={<SkipIfProfile><AccessScreen /></SkipIfProfile>} />
      <Route path="configuracion" element={<SkipIfProfile><SetupScreen /></SkipIfProfile>} />
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
