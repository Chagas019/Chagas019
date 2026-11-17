import { cn } from "@/lib/utils";

export function Spinner({ size = "md", label, className }: { size?: "sm" | "md" | "lg"; label?: string; className?: string }) {
  const dims = { sm: "size-4 border-2", md: "size-6 border-2", lg: "size-10 border-[3px]" }[size];
  return (
    <span role={label ? "status" : undefined} className={cn("inline-flex items-center", className)}>
      <span aria-hidden className={cn("animate-spin rounded-full border-current border-r-transparent", dims)} />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
