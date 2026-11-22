import { forwardRef } from 'react';
import { Link, NavLink, type LinkProps, type NavLinkProps } from 'react-router';

/** Link com View Transitions API (quando o navegador suporta). URLs reais: voltar/avançar funcionam normalmente. */
export const TLink = forwardRef<HTMLAnchorElement, LinkProps>(function TLink(props, ref) {
  return <Link ref={ref} viewTransition {...props} />;
});

export const TNavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function TNavLink(props, ref) {
  return <NavLink ref={ref} viewTransition {...props} />;
});
