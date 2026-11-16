import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { localeNames, locales } from "@/i18n/config";
import { setLocaleAction } from "@/i18n/actions";
import { Logo } from "./logo";

export async function SiteFooter() {
  const { m, locale } = await getI18n();
  return (
    <footer className="mt-16 border-t border-border bg-night-950 text-ink-muted">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:px-8">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed">{m.footer.tagline}</p>
          <p className="font-display text-gold-400">{m.brand.slogan}</p>
        </div>
        <nav aria-label={m.footer.product}>
          <h2 className="mb-3 font-sans text-xs font-semibold tracking-[0.18em] text-white uppercase">{m.footer.product}</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/oportunidades">{m.nav.opportunities}</Link></li>
            <li><Link className="hover:text-white" href="/talentos">{m.nav.talents}</Link></li>
            <li><Link className="hover:text-white" href="/comunidades">{m.nav.communities}</Link></li>
          </ul>
        </nav>
        <nav aria-label={m.footer.legal}>
          <h2 className="mb-3 font-sans text-xs font-semibold tracking-[0.18em] text-white uppercase">{m.footer.legal}</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/termos">{m.footer.terms}</Link></li>
            <li><Link className="hover:text-white" href="/privacidade">{m.footer.privacy}</Link></li>
            <li><Link className="hover:text-white" href="/design-system">{m.footer.designSystem}</Link></li>
          </ul>
        </nav>
        <form action={setLocaleAction} className="space-y-3">
          <label htmlFor="footer-locale" className="block font-sans text-xs font-semibold tracking-[0.18em] text-white uppercase">{m.footer.language}</label>
          <div className="flex gap-2">
            <select
              id="footer-locale"
              name="locale"
              defaultValue={locale}
              className="h-11 min-w-0 flex-1 rounded-md border border-white/20 bg-night-700 px-3 text-sm text-white"
            >
              {locales.map((l) => <option key={l} value={l}>{localeNames[l]}</option>)}
            </select>
            <button type="submit" className="h-11 rounded-full bg-gold-400 px-4 text-sm font-semibold text-night-950 hover:bg-gold-300">
              {m.footer.changeLanguage}
            </button>
          </div>
        </form>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs sm:px-6 lg:px-8">© {new Date().getFullYear()} {m.footer.rights}</p>
      </div>
    </footer>
  );
}
