import { cn } from '../cn';

const SOURCES = {
  app: '/branding/masi-logo-app.png',
  welcome: '/branding/masi-logo-welcome.png',
} as const;

export function MasiLogo({ variant = 'app', className, priority = false }: { variant?: keyof typeof SOURCES; className?: string; priority?: boolean }) {
  return <img
    src={SOURCES[variant]}
    alt="Masi"
    width={1254}
    height={1254}
    fetchPriority={priority ? 'high' : 'auto'}
    className={cn('block object-contain', className)}
  />;
}
