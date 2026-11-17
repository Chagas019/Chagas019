"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { sendMessageAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { FormMessage, prev, SubmitButton } from "@/components/ui/form";
import { Textarea } from "@/components/ui/field";

export function MessageComposer({ conversationId, labels }: { conversationId: string; labels: { label: string; placeholder: string; send: string; sending: string } }) {
  const [state, action] = useActionState(sendMessageAction, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      {state.status === "error" ? <FormMessage state={state} /> : null}
      <input type="hidden" name="conversationId" value={conversationId} />
      <label htmlFor="msg-body" className="sr-only">{labels.label}</label>
      <div className="flex items-end gap-3">
        <Textarea
          id="msg-body"
          name="body"
          rows={2}
          maxLength={4000}
          required
          placeholder={labels.placeholder}
          defaultValue={state.status === "error" ? prev(state, "body") : ""}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) formRef.current?.requestSubmit();
          }}
        />
        <SubmitButton pendingLabel={labels.sending} size="icon" aria-label={labels.send} className="shrink-0">
          <Send aria-hidden />
        </SubmitButton>
      </div>
    </form>
  );
}
