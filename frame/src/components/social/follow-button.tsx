"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setFollowAction } from "@/server/actions/social";

export function FollowButton({ targetId, initial, signedIn, size = "sm" }: { targetId: string; initial: boolean; signedIn: boolean; size?: "sm" | "md" }) {
  const [following, setFollowing] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button
      size={size}
      variant={following ? "outline" : "primary"}
      aria-pressed={following}
      loading={pending}
      onClick={() => {
        if (!signedIn) return router.push("/cadastro");
        const next = !following;
        setFollowing(next);
        start(async () => {
          const r = await setFollowAction(targetId, next);
          if (!r.ok) {
            setFollowing(!next);
            toast.show(r.error, "error");
          } else router.refresh();
        });
      }}
    >
      {following ? "Seguindo" : "Seguir"}
    </Button>
  );
}
