import Link from "next/link";
import { tokenize } from "@/lib/text";
import { cn } from "@/lib/utils";

/** Texto do usuário com #hashtags e @menções clicáveis. O conteúdo é sempre escapado pelo React. */
export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <p className={cn("whitespace-pre-line break-words", className)}>
      {tokenize(text).map((part, i) =>
        part.type === "text" ? (
          part.value
        ) : part.type === "tag" ? (
          <Link key={i} href={`/descobrir?q=${encodeURIComponent("#" + part.value)}`} className="font-medium text-cobalt-400 hover:text-volt-500">
            #{part.value}
          </Link>
        ) : (
          <Link key={i} href={`/u/${part.value}`} className="font-medium text-volt-500 hover:underline">
            @{part.value}
          </Link>
        ),
      )}
    </p>
  );
}
