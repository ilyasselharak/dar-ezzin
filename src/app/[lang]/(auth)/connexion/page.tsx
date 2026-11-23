import { Suspense } from "react";
import { AuthForm } from "../auth-form";
import { localizedMetadata } from "@/lib/seo-server";

export async function generateMetadata() {
  return localizedMetadata({ title: "Connexion", path: "/connexion", noIndex: true });
}

export default function SignInPage() {
  return <Suspense><AuthForm mode="sign-in" /></Suspense>;
}
