"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";

export function MobileNav({ items, loggedIn, isAdmin, signOut }: { items: { href: string; label: string }[]; loggedIn: boolean; isAdmin: boolean; signOut: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links = [...items, ...(loggedIn ? [{ href: "/lab", label: "My Lab" }] : []), ...(isAdmin ? [{ href: "/admin", label: "Admin Studio" }] : [])];
  return (
    <div className="lg:hidden">
      <button aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="menu-mobile" onClick={() => setOpen((v) => !v)} className="grid size-10 place-items-center rounded-full text-bone hover:bg-bone/10">
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-mobile"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col overflow-y-auto bg-ink px-4 pb-10 pt-6"
          >
            <nav aria-label="Menu móvel">
              <ul className="divide-y divide-bone/10 border-y border-bone/10">
                {links.map((l, i) => (
                  <motion.li key={l.href} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i + 0.05 }}>
                    <Link href={l.href} className="flex items-center justify-between py-5">
                      <span className="display text-5xl">{l.label}</span>
                      <ArrowUpRight className="size-6 text-signal" aria-hidden />
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="mt-auto grid gap-3 pt-10">
              {loggedIn ? (
                <form action={signOut}>
                  <button className="h-14 w-full rounded-full border border-bone/25 text-bone">Sair da conta</button>
                </form>
              ) : (
                <>
                  <Link href="/cadastro" className="grid h-14 place-items-center rounded-full bg-signal font-medium text-signal-ink">
                    Criar conta grátis
                  </Link>
                  <Link href="/entrar" className="grid h-14 place-items-center rounded-full border border-bone/25">
                    Entrar
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
