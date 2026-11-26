// Ilustrações vetoriais próprias (sem imagens de terceiros): vitral geométrico + símbolo do tema.
import {
  Flame, Heart, Sparkles, Sun, Wheat, Flower2, HandHeart, Anchor, Star, Mountain, BookOpen, Users, Megaphone,
  Cross, Droplets, Church, Music, Feather, Crown, Gift, HandHelping,
} from "lucide-react";

const ICON: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  adoracao: Sun, louvor: Music, "cura-e-libertacao": Droplets, perdao: HandHelping, conversao: Feather,
  "espirito-santo": Flame, eucaristia: Wheat, maria: Flower2, misericordia: HandHeart, "fe-e-esperanca": Anchor,
  santidade: Sparkles, quaresma: Mountain, advento: Star, oracao: Church, familia: Users, missao: Megaphone,
  "amor-de-deus": Heart, "sofrimento-e-cruz": Cross, "palavra-de-deus": BookOpen, pascoa: Crown, natal: Gift,
};

const PALETTES = [
  ["#14244D", "#2D4A8A", "#B8924A"],
  ["#1A2F63", "#3E5C9A", "#E2C78A"],
  ["#2B2140", "#5B3A7A", "#E2C78A"],
  ["#1E3A34", "#3F6B4A", "#E2C78A"],
  ["#4A1F24", "#8C2F39", "#E2C78A"],
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function ThemeArt({ theme, className = "h-32", label }: { theme: string; className?: string; label?: string }) {
  const h = hash(theme);
  const [bg, mid, gold] = PALETTES[h % PALETTES.length];
  const Icon = ICON[theme] ?? Sparkles;
  const rot = (h % 4) * 15;
  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`} style={{ background: bg }} role="img" aria-label={label ?? "Ilustração decorativa"}>
      <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <g transform={`rotate(${rot} 100 60)`} opacity="0.55">
          {Array.from({ length: 7 }).map((_, i) => (
            <path key={i} d={`M100 60 L${100 + 140 * Math.cos((i / 7) * Math.PI * 2)} ${60 + 140 * Math.sin((i / 7) * Math.PI * 2)} L${100 + 140 * Math.cos(((i + 0.5) / 7) * Math.PI * 2)} ${60 + 140 * Math.sin(((i + 0.5) / 7) * Math.PI * 2)} Z`} fill={i % 2 ? mid : bg} />
          ))}
        </g>
        <circle cx="100" cy="60" r="34" fill="none" stroke={gold} strokeWidth="0.8" opacity="0.7" />
        <circle cx="100" cy="60" r="44" fill="none" stroke={gold} strokeWidth="0.4" opacity="0.45" />
        <circle cx="100" cy="60" r="26" fill={bg} opacity="0.85" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className="h-8 w-8 text-gold-300" strokeWidth={1.4} />
      </div>
    </div>
  );
}
