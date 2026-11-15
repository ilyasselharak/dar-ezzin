import "server-only";
import { db } from "@/lib/db";
import type { OrderStatus, Prisma, ProductStatus } from "@/generated/prisma/client";

const PAGE_SIZE = 25;

export async function getDashboardStats() {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 86_400_000);
  const since14 = new Date(now.getTime() - 13 * 86_400_000);
  since14.setHours(0, 0, 0, 0);
  const validStatuses: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

  const [revenue30, orders30, pending, lowStock, outOfStock, recentOrders, daily, topProducts, customers] = await Promise.all([
    db.order.aggregate({ where: { createdAt: { gte: since30 }, status: { in: validStatuses } }, _sum: { total: true } }),
    db.order.count({ where: { createdAt: { gte: since30 } } }),
    db.order.count({ where: { status: "PENDING" } }),
    db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM "Product" WHERE status = 'ACTIVE' AND stock > 0 AND stock <= "lowStockThreshold"`,
    db.product.count({ where: { status: "ACTIVE", stock: { lte: 0 } } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, number: true, fullName: true, city: true, total: true, status: true, createdAt: true } }),
    db.$queryRaw<{ day: Date; revenue: bigint; orders: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COALESCE(SUM(total), 0)::bigint AS revenue, COUNT(*)::bigint AS orders
      FROM "Order"
      WHERE "createdAt" >= ${since14} AND status NOT IN ('CANCELLED', 'RETURNED')
      GROUP BY 1 ORDER BY 1`,
    db.orderItem.groupBy({
      by: ["productId", "name"],
      where: { order: { createdAt: { gte: since30 }, status: { in: validStatuses } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 5,
    }),
    db.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  const series = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since14.getTime() + i * 86_400_000);
    const row = daily.find((r) => new Date(r.day).toDateString() === d.toDateString());
    return { date: d.toISOString(), revenue: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0) };
  });

  const revenue = revenue30._sum.total ?? 0;
  return {
    revenue30: revenue,
    orders30,
    averageOrder: orders30 ? Math.round(revenue / orders30) : 0,
    pending,
    lowStock: Number(lowStock[0]?.count ?? 0),
    outOfStock,
    customers,
    recentOrders,
    series,
    topProducts: topProducts.map((t) => ({ productId: t.productId, name: t.name, quantity: t._sum.quantity ?? 0, revenue: t._sum.lineTotal ?? 0 })),
  };
}

export async function listAdminOrders({ status, q, page = 1 }: { status?: OrderStatus; q?: string; page?: number }) {
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { fullName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q.replace(/\s/g, "") } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total, counts] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, number: true, fullName: true, phone: true, city: true, total: true, status: true, createdAt: true, _count: { select: { items: true } } },
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) as Partial<Record<OrderStatus, number>> };
}

export async function getAdminOrder(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { slug: true, stock: true } } } },
      events: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function listAdminProducts({ q, status, categoryId, stock, page = 1 }: { q?: string; status?: ProductStatus; categoryId?: string; stock?: "low" | "out"; page?: number }) {
  const where: Prisma.ProductWhereInput = {
    ...(status ? { status } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(stock === "out" ? { stock: { lte: 0 } } : stock === "low" ? { stock: { gt: 0, lte: 5 } } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, slug: true, sku: true, price: true, compareAtPrice: true, stock: true, lowStockThreshold: true, status: true, isFeatured: true, updatedAt: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
        images: { orderBy: { position: "asc" }, take: 1, select: { key: true } },
      },
    }),
    db.product.count({ where }),
  ]);
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getAdminProduct(id: string) {
  return db.product.findUnique({ where: { id }, include: { images: { orderBy: { position: "asc" } } } });
}

export async function getTaxonomyOptions() {
  const [categories, brands] = await Promise.all([
    db.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true, parentId: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  // Flatten into "Parent › Child" labels
  const label = (c: { name: string; parentId: string | null }) => {
    const parent = c.parentId ? categories.find((p) => p.id === c.parentId) : null;
    return parent ? `${parent.name} › ${c.name}` : c.name;
  };
  return {
    categories: categories.map((c) => ({ id: c.id, name: label(c), parentId: c.parentId })).sort((a, b) => a.name.localeCompare(b.name, "fr")),
    brands,
  };
}

export async function listInventory({ q, filter, page = 1 }: { q?: string; filter?: "low" | "out"; page?: number }) {
  const where: Prisma.ProductWhereInput = {
    status: { not: "ARCHIVED" },
    ...(filter === "out" ? { stock: { lte: 0 } } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}),
  };
  let items = await db.product.findMany({
    where,
    orderBy: [{ stock: "asc" }, { name: "asc" }],
    take: filter === "low" ? 500 : PAGE_SIZE,
    skip: filter === "low" ? 0 : (page - 1) * PAGE_SIZE,
    select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true, status: true, images: { take: 1, orderBy: { position: "asc" }, select: { key: true } } },
  });
  if (filter === "low") items = items.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);
  const total = filter === "low" ? items.length : await db.product.count({ where });
  const movements = await db.inventoryMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { product: { select: { name: true, sku: true } }, user: { select: { name: true } } },
  });
  return { items, total, page, pageCount: filter === "low" ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE)), movements };
}

export async function listCustomers({ q, page = 1 }: { q?: string; page?: number }) {
  const where: Prisma.UserWhereInput = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }
    : {};
  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true, _count: { select: { orders: true } } },
    }),
    db.user.count({ where }),
  ]);
  // Top guest customers aggregated by phone (COD stores mostly get guest orders)
  const guests = await db.order.groupBy({
    by: ["phone", "fullName", "city"],
    where: { userId: null },
    _count: true,
    _sum: { total: true },
    orderBy: { _sum: { total: "desc" } },
    take: 20,
  });
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), guests };
}
