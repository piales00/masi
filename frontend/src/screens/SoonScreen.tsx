import type { LucideIcon } from 'lucide-react';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';

export function SoonScreen({ title, text, icon: Icon }: { title: string; text: string; icon: LucideIcon }) {
  return <Screen header={<ScreenHeader title={title} back={false} />}>
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-10 text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-masi-blue-50 text-masi-blue"><Icon size={30} aria-hidden="true" /></span>
      <p className="mt-5 max-w-sm text-base text-masi-muted">{text}</p>
    </div>
  </Screen>;
}
