import "server-only";
import { unstable_cache } from "next/cache";
import { api } from "@convex/_generated/api";
import { publicQuery } from "@/lib/convex";
import { TAGS } from "@/server/cache";

export const getSettings = unstable_cache(() => publicQuery(api.catalog.settings, {}), ["store-settings"], { tags: [TAGS.settings], revalidate: 3600 });

export type StoreSettingsData = Awaited<ReturnType<typeof getSettings>>;
