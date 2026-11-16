"use client";

import { useActionState, useId, useState } from "react";
import { Star } from "lucide-react";
import { submitReviewAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Labels { open: string; rating: string; stars: string; comment: string; submit: string; sending: string }

/** Avaliação de 1 a 5 com rádios nativos (teclado e leitor de tela), aberta sob demanda. */
export function ReviewForm({ applicationId, target, revieweeId, back, labels }: {
  applicationId: string; target: "community" | "profile"; revieweeId: string; back: string; labels: Labels;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [state, action] = useActionState(submitReviewAction, idleState);
  const panelId = useId();
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <div>
      <Button size="sm" variant="outline" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
        <Star aria-hidden />{labels.open}
      </Button>
      <form id={panelId} hidden={!open} action={action} className="mt-3 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <FormMessage state={state} />
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="target" value={target} />
        <input type="hidden" name="revieweeId" value={revieweeId} />
        <input type="hidden" name="back" value={back} />
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{labels.rating}<span aria-hidden className="ml-0.5 text-danger">*</span></legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="relative cursor-pointer">
                <input type="radio" name="rating" value={n} required checked={rating === n} onChange={() => setRating(n)} className="peer absolute inset-0 opacity-0" />
                <Star aria-hidden className={cn("size-8 transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-gold-500", n <= rating ? "fill-gold-500 text-gold-600" : "text-sand-400")} />
                <span className="sr-only">{labels.stars.replace("{n}", String(n))}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={labels.comment}>
          {({ id }) => <Textarea id={id} name="comment" rows={3} maxLength={1500} />}
        </Field>
        <SubmitButton pendingLabel={labels.sending} variant="gold" size="sm" className="self-start" disabled={rating === 0}>{labels.submit}</SubmitButton>
      </form>
    </div>
  );
}
