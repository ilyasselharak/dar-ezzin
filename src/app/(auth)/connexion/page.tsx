import { Suspense } from "react";
import { AuthForm } from "../auth-form";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Connexion", path: "/connexion", noIndex: true });

export default function SignInPage() {
  return <Suspense><AuthForm mode="sign-in" /></Suspense>;
}
