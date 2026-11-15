import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { TAGS } from "@/server/cache";

export const getSettings = unstable_cache(
  async () => {
    return db.storeSettings.upsert({ where: { id: "store" }, update: {}, create: { id: "store" } });
  },
  ["store-settings"],
  { tags: [TAGS.settings], revalidate: 3600 },
);

export type StoreSettingsData = Awaited<ReturnType<typeof getSettings>>;
