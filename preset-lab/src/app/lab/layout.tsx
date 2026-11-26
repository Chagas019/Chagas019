import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LabTabs } from "@/components/lab/lab-tabs";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { PLANS } from "@/lib/payments/plans";
import { getEntitlements } from "@/lib/services/entitlements";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "My Lab", template: "%s · My Lab · PRESET LAB" }, robots: { index: false } };

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/lab");
  const ent = await getEntitlements(user);
  const name = user.profile.display_name || user.email.split("@")[0];
  const first = name.split(" ")[0];
  const sub = ent.subscription;

  return (
    <div className="pb-24">
      <header className="border-b hairline">
        <div className="container-lab pb-6 pt-10 md:pt-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="lab-label text-signal">My Lab · Área pessoal</p>
              <h1 className="display mt-7 break-words text-[clamp(3rem,10vw,8rem)]">
                Olá, <span className="serif-accent text-[0.8em] text-bone/90">{first}</span>
                <span className="text-signal">.</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end lg:pb-3">
              {sub ? (
                <div className="flex flex-wrap items-center gap-3 rounded-full border border-signal/50 py-2 pl-2 pr-4">
                  <Badge tone="premium">Premium Club</Badge>
                  <span className="text-sm text-ash">
                    {PLANS[sub.plan]?.period === "ano" ? "Anual" : "Mensal"} · até {formatDate(sub.current_period_end)}
                  </span>
                </div>
              ) : (
                <Link href="/premium" className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-bone/20 px-5 text-sm text-bone/85 transition hover:border-signal hover:text-bone">
                  Conhecer o Premium Club
                  <ArrowUpRight className="size-4 text-signal transition group-hover:rotate-45" aria-hidden />
                </Link>
              )}
            </div>
          </div>
          <div className="mt-10">
            <LabTabs />
          </div>
        </div>
      </header>
      <div className="container-lab pt-10 md:pt-14">{children}</div>
    </div>
  );
}
