import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthLayout } from './components/AuthLayout';
import { useDemo } from './demo/DemoContext';
import { AccessScreen } from './screens/AccessScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ProviderSoonScreen } from './screens/ProviderSoonScreen';
import { RoleScreen } from './screens/RoleScreen';
import { SetupScreen } from './screens/SetupScreen';
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

    <Route element={<AppShell />}>
      <Route path="home" element={<RequireProfile><HomeScreen /></RequireProfile>} />
    </Route>

    <Route path="*" element={<Navigate to="/splash" replace />} />
  </Routes>;
}
