import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle, Camera, Crown, Inbox, Loader2, Mic, MonitorPlay, PenTool, Radio, Share2, Smartphone, Sparkles, Video, X,
  Aperture, Clapperboard, Headphones, Lightbulb, Megaphone, Music, Palette, Users, type LucideIcon,
} from 'lucide-react';

export const ROLE_ICONS: Record<string, LucideIcon> = {
  Camera, Video, Smartphone, Share2, PenTool, MonitorPlay, Radio, Mic, Crown, Aperture, Clapperboard, Headphones, Lightbulb, Megaphone, Music, Palette, Users, Sparkles,
};
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn, initials } from '@/lib/utils';

/* ---------- Button ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-neon text-bg font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-2px_6px_rgba(0,0,0,0.12)] hover:shadow-glow hover:brightness-105',
  secondary: 'glass text-ink border border-white/[0.08] hover:bg-white/[0.06]',
  outline: 'border border-neon/40 text-neon hover:bg-neon-soft',
  ghost: 'text-ink-muted hover:text-ink hover:bg-white/5',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'icon';
  loading?: boolean;
  icon?: LucideIcon;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, icon: Icon, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-full text-sm transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' && 'h-9 px-3.5 text-[13px]',
        size === 'md' && 'h-11 px-5',
        size === 'icon' && 'h-11 w-11',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

/* ---------- Card ---------- */
export function Card({ className, children, hover, ...rest }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn('card p-5', hover && 'transition-all duration-300 hover:-translate-y-0.5 hover:border-line hover:bg-[#121822]', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */
export type Tone = 'neon' | 'electric' | 'warn' | 'danger' | 'muted';
const TONES: Record<Tone, string> = {
  neon: 'bg-neon/10 text-neon border-neon/25',
  electric: 'bg-electric/10 text-electric border-electric/25',
  warn: 'bg-warn/10 text-warn border-warn/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
  muted: 'bg-white/5 text-ink-muted border-line',
};
export function Badge({ tone = 'muted', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium', TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---------- Form ---------- */
export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="label">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-xs text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...rest }, ref) => (
    <input ref={ref} aria-invalid={invalid || undefined} className={cn('input', invalid && 'border-danger/60', className)} {...rest} />
  ),
);
Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  ({ className, invalid, children, ...rest }, ref) => (
    <select ref={ref} aria-invalid={invalid || undefined} className={cn('input appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9', invalid && 'border-danger/60', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2396A3B5' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...rest}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...rest }, ref) => (
  <textarea ref={ref} className={cn('input h-auto min-h-[88px] py-3', className)} {...rest} />
));
Textarea.displayName = 'Textarea';

/* ---------- Segmented ---------- */
export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: LucideIcon }[]; className?: string }) {
  return (
    <div role="tablist" className={cn('glass inline-flex rounded-full border border-white/[0.07] p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('relative flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors', value === o.value ? 'text-bg' : 'text-ink-muted hover:text-ink')}
        >
          {value === o.value && <motion.span layoutId={`seg-${options.map((x) => x.value).join()}`} className="absolute inset-0 rounded-full bg-neon shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_0_18px_-4px_#5BFF9A]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          {o.icon && <o.icon className="relative h-3.5 w-3.5" />}
          <span className="relative font-medium">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Avatar ---------- */
const AV_COLORS = ['#5BFF9A', '#55B8FF', '#B98BFF', '#FFC857', '#FF8BD1', '#7CF5FF'];
export function Avatar({ name, photo, size = 36, ring }: { name: string; photo?: string; size?: number; ring?: boolean }) {
  const c = AV_COLORS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AV_COLORS.length];
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold', ring && 'ring-2 ring-bg')}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `${c}22`, color: c, border: `1px solid ${c}44` }}
      aria-hidden
    >
      {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initials(name)}
    </span>
  );
}

/* ---------- Role icon ---------- */
export function RoleIcon({ icon, color, size = 16, boxed }: { icon: string; color: string; size?: number; boxed?: boolean }) {
  const I = ROLE_ICONS[icon] ?? Sparkles;
  if (!boxed) return <I style={{ color, width: size, height: size }} />;
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}18`, width: size * 2.2, height: size * 2.2 }}>
      <I style={{ color, width: size, height: size }} />
    </span>
  );
}

/* ---------- Progress ring ---------- */
export function ProgressRing({ value, size = 64, stroke = 6, label }: { value: number; size?: number; stroke?: number; label?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const reduce = useReducedMotion();
  const id = `pr${size}${stroke}`;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${value}% de cobertura`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5BFF9A" />
            <stop offset="1" stopColor="#55B8FF" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#252F3C" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c - (value / 100) * c : c }}
          animate={{ strokeDashoffset: c - (value / 100) * c }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute text-sm font-semibold">{label ?? `${value}%`}</span>
    </div>
  );
}

export function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-line/70', className)}>
      <motion.div className="h-full rounded-full bg-flow" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

/* ---------- Empty / Skeleton ---------- */
export function EmptyState({ icon: Icon = Inbox, title, body, action }: { icon?: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line px-6 py-12 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-soft text-neon">
        <Icon className="h-5 w-5" />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-2xl', className)} />;
}

/* ---------- Modal ---------- */
export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <div
                className="fixed inset-0 z-50 flex items-end justify-center focus:outline-none sm:items-center sm:p-4"
                onPointerDown={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
              >
                <motion.div
                  className={cn(
                    'flex max-h-[92dvh] w-full min-w-0 max-w-full flex-col rounded-t-3xl border border-white/10 bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_40px_80px_-20px_rgba(0,0,0,0.9)] sm:rounded-3xl',
                    size === 'sm' && 'sm:max-w-md',
                    size === 'md' && 'sm:max-w-xl',
                    size === 'lg' && 'sm:max-w-3xl',
                  )}
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                >
                  <div className="flex items-start justify-between gap-4 border-b border-line/60 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                      <Dialog.Title className="break-words text-lg font-semibold tracking-tight">{title}</Dialog.Title>
                      <Dialog.Description className={description ? 'mt-0.5 text-sm text-ink-muted' : 'sr-only'}>{description ?? title}</Dialog.Description>
                    </div>
                    <Dialog.Close className="rounded-full p-2 text-ink-muted transition-colors hover:bg-white/5 hover:text-ink" aria-label="Fechar">
                      <X className="h-5 w-5" />
                    </Dialog.Close>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
                  {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line/60 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel = 'Excluir', onConfirm }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onOpenChange(false); }}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="text-sm text-ink-muted">{body}</p>
      </div>
    </Modal>
  );
}

/* ---------- Page header + motion ---------- */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] } }),
};

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
      {children}
    </motion.div>
  );
}

export function Item({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}
