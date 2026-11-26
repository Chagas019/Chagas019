import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function SectionHead({ kicker, title, href, linkLabel }: { kicker?: string; title: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {kicker && <p className="lab-label text-smoke">{kicker}</p>}
        <h2 className="display mt-3 text-[clamp(2.6rem,6.5vw,5.5rem)]">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="group inline-flex items-center gap-2 self-start text-sm text-bone/80 hover:text-bone md:self-auto">
          <span className="link-underline">{linkLabel}</span>
          <ArrowUpRight className="size-4 text-signal transition group-hover:rotate-45" aria-hidden />
        </Link>
      )}
    </div>
  );
}
