/** Transição suave a cada navegação (opacity/transform; desligada com prefers-reduced-motion). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
