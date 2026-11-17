import { StatePanel } from "@/components/ui";
import type { Messages } from "@/i18n/types";

export function BackendUnavailable({ m, headingLevel = 2 }: { m: Messages; headingLevel?: 1 | 2 }) {
  return (
    <StatePanel variant="unconfigured" title={m.states.backendTitle} headingLevel={headingLevel}>
      <p>{m.states.backendBody}</p>
    </StatePanel>
  );
}
