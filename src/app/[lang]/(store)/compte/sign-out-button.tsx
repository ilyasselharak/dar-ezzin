"use client";

import { useLocalePath } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const lp = useLocalePath();
  return (
    <Button
      variant="outline"
      className="rounded-full"
      onClick={async () => {
        await signOut();
        router.push(lp("/"));
        router.refresh();
      }}
    >
      <LogOut /> Se déconnecter
    </Button>
  );
}
