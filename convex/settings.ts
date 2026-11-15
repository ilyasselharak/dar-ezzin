import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { opt } from "./lib/products";

export const save = mutation({
  args: {
    storeName: v.string(),
    tagline: v.string(),
    phone: v.string(),
    whatsapp: v.string(),
    email: v.string(),
    address: v.string(),
    shippingFee: v.number(),
    freeShippingThreshold: v.number(),
    announcement: v.optional(v.union(v.string(), v.null())),
    facebookUrl: v.optional(v.union(v.string(), v.null())),
    instagramUrl: v.optional(v.union(v.string(), v.null())),
    tiktokUrl: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const doc = {
      ...a,
      announcement: opt(a.announcement),
      facebookUrl: opt(a.facebookUrl),
      instagramUrl: opt(a.instagramUrl),
      tiktokUrl: opt(a.tiktokUrl),
      updatedAt: Date.now(),
    };
    const existing = await ctx.db.query("settings").first();
    if (existing) await ctx.db.replace(existing._id, doc);
    else await ctx.db.insert("settings", doc);
  },
});
