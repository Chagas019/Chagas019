import { LogoMark } from './Logo';

export function PageFallback() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center text-paper" role="status" aria-label="Carregando página">
      <LogoMark size={36} className="animate-pulse opacity-60" />
    </div>
  );
}
