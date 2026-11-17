"use client";

import { useEffect } from "react";
import { Button, ButtonLink, StatePanel } from "@/components/ui";
import { messagesFor } from "@/i18n/format";
import { defaultLocale, isLocale } from "@/i18n/config";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[ui]", error.digest ?? error.message);
  }, [error]);
  const lang = typeof document !== "undefined" ? document.documentElement.lang : defaultLocale;
  const m = messagesFor(isLocale(lang) ? lang : defaultLocale);
  return (
    <div className="px-4 py-20">
      <StatePanel
        variant="error"
        title={m.states.errorTitle}
        headingLevel={1}
        action={
          <>
            <Button onClick={reset}>{m.states.retry}</Button>
            <ButtonLink href="/" variant="outline">{m.states.goHome}</ButtonLink>
          </>
        }
      >
        <p>{m.states.errorBody}</p>
        {error.digest ? <p className="mt-2 font-mono text-xs">ref: {error.digest}</p> : null}
      </StatePanel>
    </div>
  );
}
