import { Suspense } from "react";
import { AuthForm } from "../auth-form";
import { localizedMetadata } from "@/lib/seo-server";

export async function generateMetadata() {
  return localizedMetadata({ title: "Créer un compte", path: "/inscription", noIndex: true });
}

export default function SignUpPage() {
  return <Suspense><AuthForm mode="sign-up" /></Suspense>;
}
