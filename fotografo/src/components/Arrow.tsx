export default function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
