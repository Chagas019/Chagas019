import { ButtonLink, StatePanel } from "@/components/ui";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { m } = await getI18n();
  return (
    <div className="px-4 py-20">
      <StatePanel variant="empty" title={m.states.notFoundTitle} headingLevel={1} action={<ButtonLink href="/">{m.states.goHome}</ButtonLink>}>
        <p>{m.states.notFoundBody}</p>
      </StatePanel>
    </div>
  );
}
