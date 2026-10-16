// Fundo da abertura: Jesus em movimento lento (zoom e deslize suaves, luz que respira e
// partículas de luz subindo). Pintura "Cristo no Getsêmani", de Heinrich Hofmann (1886),
// domínio público, servida pelo Wikimedia Commons.
export const JESUS_IMG = 'https://upload.wikimedia.org/wikipedia/commons/6/68/Christ_in_Gethsemane.jpg';
export const JESUS_CREDITO = 'Heinrich Hofmann, “Cristo no Getsêmani” (1886), domínio público, via Wikimedia Commons';

const PARTICULAS = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 53) % 100}%`,
  delay: `${(i * 1.7) % 12}s`,
  duration: `${10 + ((i * 7) % 9)}s`,
  size: 2 + (i % 3),
}));

export default function JesusBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden>
      <img
        src={JESUS_IMG}
        alt=""
        className="jesus-move absolute inset-0 h-full w-full object-cover object-[60%_30%] md:object-[50%_35%]"
      />
      {/* Luz divina que pulsa devagar */}
      <div className="jesus-glow absolute inset-0" />
      {/* Partículas de luz subindo */}
      <div className="absolute inset-0">
        {PARTICULAS.map((p, i) => (
          <span
            key={i}
            className="jesus-particle absolute bottom-[-10px] rounded-full bg-amber-100/70"
            style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.duration }}
          />
        ))}
      </div>
      {/* Escurece à esquerda para o texto ficar legível */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent md:from-black/75 md:via-black/30" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
    </div>
  );
}
