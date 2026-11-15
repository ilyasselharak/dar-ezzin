import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Dar Ezzin data model. Prices are integers in centimes (MAD × 100).
// Users, sessions and accounts live in the Better Auth component (convex/betterAuth).

export const productStatus = v.union(v.literal("DRAFT"), v.literal("ACTIVE"), v.literal("ARCHIVED"));
export const orderStatus = v.union(
  v.literal("PENDING"),
  v.literal("CONFIRMED"),
  v.literal("PROCESSING"),
  v.literal("SHIPPED"),
  v.literal("DELIVERED"),
  v.literal("CANCELLED"),
  v.literal("RETURNED"),
);
export const movementReason = v.union(
  v.literal("RESTOCK"),
  v.literal("SALE"),
  v.literal("ORDER_CANCELLED"),
  v.literal("ADJUSTMENT"),
  v.literal("RETURN"),
  v.literal("DAMAGE"),
);

export const productImage = v.object({
  /** Cloudinary public_id */
  key: v.string(),
  alt: v.optional(v.string()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  size: v.optional(v.number()),
  mimeType: v.optional(v.string()),
});

export const orderItem = v.object({
  productId: v.optional(v.id("products")),
  name: v.string(),
  sku: v.string(),
  imageKey: v.optional(v.string()),
  unitPrice: v.number(),
  quantity: v.number(),
  lineTotal: v.number(),
});

export default defineSchema({
  settings: defineTable({
    storeName: v.string(),
    tagline: v.string(),
    phone: v.string(),
    whatsapp: v.string(),
    email: v.string(),
    address: v.string(),
    shippingFee: v.number(),
    freeShippingThreshold: v.number(),
    announcement: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    tiktokUrl: v.optional(v.string()),
    updatedAt: v.number(),
  }),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageKey: v.optional(v.string()),
    /** lucide icon name used on the storefront */
    icon: v.optional(v.string()),
    position: v.number(),
    isActive: v.boolean(),
    parentId: v.optional(v.id("categories")),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_parent", ["parentId"]),

  brands: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    logoKey: v.optional(v.string()),
    isActive: v.boolean(),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  products: defineTable({
    name: v.string(),
    slug: v.string(),
    sku: v.string(),
    shortDescription: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.number(),
    compareAtPrice: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    stock: v.number(),
    lowStockThreshold: v.number(),
    status: productStatus,
    isFeatured: v.boolean(),
    warrantyMonths: v.optional(v.number()),
    specs: v.array(v.object({ label: v.string(), value: v.string() })),
    categoryId: v.optional(v.id("categories")),
    brandId: v.optional(v.id("brands")),
    images: v.array(productImage),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    salesCount: v.number(),
    /** Electro Darna product id this product was cloned from (stock synced from it). */
    sourceId: v.optional(v.string()),
    sourceSyncedAt: v.optional(v.number()),
    /** Lower-cased name + sku + brand + category, for search. */
    searchText: v.string(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_sku", ["sku"])
    .index("by_status", ["status"])
    .index("by_category", ["categoryId"])
    .index("by_brand", ["brandId"])
    .index("by_source", ["sourceId"]),

  orders: defineTable({
    number: v.string(),
    status: orderStatus,
    paymentMethod: v.literal("CASH_ON_DELIVERY"),
    paymentStatus: v.union(v.literal("UNPAID"), v.literal("PAID"), v.literal("REFUNDED")),
    userId: v.optional(v.string()),
    fullName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    city: v.string(),
    address: v.string(),
    customerNote: v.optional(v.string()),
    internalNote: v.optional(v.string()),
    subtotal: v.number(),
    shippingFee: v.number(),
    total: v.number(),
    items: v.array(orderItem),
    /** Secret kept in the buyer's cookie so the confirmation page can show details. */
    accessToken: v.string(),
    updatedAt: v.number(),
  })
    .index("by_number", ["number"])
    .index("by_status", ["status"])
    .index("by_user", ["userId"])
    .index("by_phone", ["phone"]),

  orderEvents: defineTable({
    orderId: v.id("orders"),
    status: v.optional(orderStatus),
    message: v.string(),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
  }).index("by_order", ["orderId"]),

  inventoryMovements: defineTable({
    productId: v.id("products"),
    delta: v.number(),
    stockAfter: v.number(),
    reason: movementReason,
    note: v.optional(v.string()),
    orderId: v.optional(v.id("orders")),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
  }).index("by_product", ["productId"]),
});
