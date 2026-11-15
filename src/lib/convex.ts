import "server-only";
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { fetchAction, fetchQuery } from "convex/nextjs";
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

/** Calls made as the signed-in user (Convex checks their role). */
export const { handler, getToken, fetchAuthQuery, fetchAuthMutation, fetchAuthAction } = convexBetterAuthNextJs({
  convexUrl,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});

/** Anonymous read of public data (safe inside unstable_cache: no cookies involved). */
export function publicQuery<Q extends FunctionReference<"query">>(query: Q, args: FunctionArgs<Q>): Promise<FunctionReturnType<Q>> {
  return fetchQuery(query, args, { url: convexUrl });
}

export function publicAction<A extends FunctionReference<"action">>(action: A, args: FunctionArgs<A>): Promise<FunctionReturnType<A>> {
  return fetchAction(action, args, { url: convexUrl });
}
