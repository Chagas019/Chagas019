import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2" aria-label="FRAME — página inicial">
      <span className="relative grid size-7 place-items-center" aria-hidden>
        <span className="absolute inset-0 rounded-[7px] border-[1.5px] border-paper/90 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-90" />
        <span className="absolute inset-[6px] rounded-[3px] bg-gradient-to-br from-volt-400 to-cobalt-500" />
      </span>
      <span className="text-[15px] font-semibold tracking-[0.32em] text-paper">FRAME</span>
    </Link>
  );
}
