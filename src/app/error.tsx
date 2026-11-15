"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
      <p className="text-muted-foreground">Nous nous excusons pour la gêne occasionnée. Veuillez réessayer.</p>
      {error.digest ? <p className="font-mono text-xs text-muted-foreground">Réf. {error.digest}</p> : null}
      <Button onClick={reset} className="rounded-full">Réessayer</Button>
    </div>
  );
}
