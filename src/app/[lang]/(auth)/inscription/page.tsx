import { Suspense } from "react";
import { AuthForm } from "../auth-form";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Créer un compte", path: "/inscription", noIndex: true });

export default function SignUpPage() {
  return <Suspense><AuthForm mode="sign-up" /></Suspense>;
}
