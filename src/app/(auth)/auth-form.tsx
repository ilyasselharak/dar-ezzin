"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth-client";

const signInSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(2, "Nom requis"),
  password: z.string().min(8, "8 caractères minimum"),
});
type Values = { name?: string; email: string; password: string };

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(mode === "sign-in" ? signInSchema : signUpSchema) as never,
    defaultValues: { name: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: Values) {
    setError(null);
    const res =
      mode === "sign-in"
        ? await signIn.email({ email: values.email, password: values.password })
        : await signUp.email({ name: values.name!, email: values.email, password: values.password });
    if (res.error) {
      setError(
        res.error.status === 401 || res.error.code === "INVALID_EMAIL_OR_PASSWORD"
          ? "Email ou mot de passe incorrect."
          : res.error.code === "USER_ALREADY_EXISTS"
            ? "Un compte existe déjà avec cet email."
            : (res.error.message ?? "Une erreur est survenue."),
      );
      return;
    }
    const role = (res.data?.user as { role?: string } | undefined)?.role;
    router.push(next ?? (role === "ADMIN" || role === "STAFF" ? "/admin" : "/compte"));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold">{mode === "sign-in" ? "Connexion" : "Créer un compte"}</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "sign-in" ? "Accédez à vos commandes et à votre espace." : "Suivez vos commandes et commandez plus vite."}
        </p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {mode === "sign-up" ? (
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom complet</Label>
            <Input id="name" autoComplete="name" className="h-11" {...form.register("name")} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" className="h-11" {...form.register("email")} />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} className="h-11" {...form.register("password")} />
          {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
        </div>
        {error ? <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
        <Button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-xl">
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          {mode === "sign-in" ? "Se connecter" : "Créer mon compte"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "sign-in" ? (
          <>Pas encore de compte ? <Link href={`/inscription${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary hover:underline">Créer un compte</Link></>
        ) : (
          <>Déjà inscrit ? <Link href={`/connexion${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary hover:underline">Se connecter</Link></>
        )}
      </p>
      <p className="text-center text-xs text-muted-foreground"><Link href="/" className="hover:underline">← Retour à la boutique</Link></p>
    </div>
  );
}
