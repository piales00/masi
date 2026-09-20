import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PhoneFrame } from './components/PhoneFrame';
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

export function App() {
  return <Routes>
    <Route element={<PhoneFrame />}>
      <Route index element={<Navigate to="/splash" replace />} />
      <Route path="splash" element={<SplashScreen />} />
      <Route path="bienvenida" element={<WelcomeScreen />} />
      <Route path="rol" element={<RoleScreen />} />
      <Route path="rol/profesional" element={<ProviderSoonScreen />} />
      <Route path="acceso" element={<AccessScreen />} />
      <Route path="configuracion" element={<SetupScreen />} />
      <Route path="home" element={<RequireProfile><HomeScreen /></RequireProfile>} />
      <Route path="*" element={<Navigate to="/splash" replace />} />
    </Route>
  </Routes>;
}
