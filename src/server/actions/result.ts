import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { AuthorizationError } from "@/lib/session";
import { logger } from "@/lib/logger";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export class UserFacingError extends Error {}

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/** Converts any thrown error into a safe, user-facing ActionResult. */
export function toActionError(err: unknown, context: string): ActionResult<never> {
  if (err instanceof z.ZodError) {
    return { ok: false, error: "Veuillez corriger les champs indiqués.", fieldErrors: z.flattenError(err).fieldErrors };
  }
  if (err instanceof AuthorizationError) return { ok: false, error: err.message };
  if (err instanceof UserFacingError) return { ok: false, error: err.message };
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = (err.meta?.target as string[] | string | undefined)?.toString() ?? "";
    return { ok: false, error: `Cette valeur existe déjà${target ? ` (${target})` : ""}.` };
  }
  logger.error(`Action failed: ${context}`, { err });
  return { ok: false, error: "Une erreur inattendue est survenue. Réessayez." };
}
