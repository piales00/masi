import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MasiLogo } from '../components/MasiLogo';

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/bienvenida', { replace: true }), 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return <div className="flex h-full flex-col items-center justify-center bg-linear-135 from-masi-bg to-masi-blue-50 px-6 pt-[var(--masi-safe-top)] pb-[var(--masi-safe-bottom)]">
    <MasiLogo variant="welcome" priority className="w-56 max-w-[70%] animate-masi-rise" />
  </div>;
}
