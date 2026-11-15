"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertStaff } from "@/lib/session";
import { brandFormSchema, categoryFormSchema, type BrandFormInput, type CategoryFormInput } from "@/lib/validators/catalog";
import { deleteStoredImage } from "@/lib/storage/image-processing";
import { invalidate, TAGS } from "@/server/cache";
import { ok, toActionError, UserFacingError, type ActionResult } from "./result";

async function cleanupReplacedImage(previous: string | null | undefined, next: string | null | undefined) {
  if (previous && previous !== next) await deleteStoredImage(previous).catch(() => undefined);
}

export async function saveCategory(id: string | null, input: CategoryFormInput): Promise<ActionResult<{ id: string }>> {
  try {
    await assertStaff();
    const data = categoryFormSchema.parse(input);
    if (data.imageKey && !data.imageKey.startsWith("categories/")) throw new UserFacingError("Image invalide.");
    if (id && data.parentId === id) throw new UserFacingError("Une catégorie ne peut pas être son propre parent.");
    if (id && data.parentId) {
      // Prevent cycles: walk up from the new parent
      let cursor: string | null = data.parentId;
      for (let depth = 0; cursor && depth < 10; depth++) {
        if (cursor === id) throw new UserFacingError("Hiérarchie invalide (boucle).");
        cursor = (await db.category.findUnique({ where: { id: cursor }, select: { parentId: true } }))?.parentId ?? null;
      }
    }
    const values = {
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      parentId: data.parentId || null,
      icon: data.icon ?? null,
      position: data.position,
      isActive: data.isActive,
      imageKey: data.imageKey || null,
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
    };
    const previous = id ? await db.category.findUnique({ where: { id }, select: { imageKey: true } }) : null;
    const saved = id
      ? await db.category.update({ where: { id }, data: values, select: { id: true } })
      : await db.category.create({ data: values, select: { id: true } });
    await cleanupReplacedImage(previous?.imageKey, values.imageKey);
    invalidate(TAGS.catalog);
    revalidatePath("/admin/categories");
    return ok(saved);
  } catch (err) {
    return toActionError(err, "saveCategory");
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await assertStaff();
    const cat = await db.category.findUnique({ where: { id }, select: { imageKey: true, _count: { select: { products: true, children: true } } } });
    if (!cat) throw new UserFacingError("Catégorie introuvable.");
    if (cat._count.products > 0) throw new UserFacingError(`Impossible : ${cat._count.products} produit(s) utilisent cette catégorie.`);
    if (cat._count.children > 0) throw new UserFacingError("Impossible : cette catégorie a des sous-catégories.");
    await db.category.delete({ where: { id } });
    await cleanupReplacedImage(cat.imageKey, null);
    invalidate(TAGS.catalog);
    revalidatePath("/admin/categories");
    return ok(undefined);
  } catch (err) {
    return toActionError(err, "deleteCategory");
  }
}

export async function saveBrand(id: string | null, input: BrandFormInput): Promise<ActionResult<{ id: string }>> {
  try {
    await assertStaff();
    const data = brandFormSchema.parse(input);
    if (data.logoKey && !data.logoKey.startsWith("brands/")) throw new UserFacingError("Image invalide.");
    const values = {
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      isActive: data.isActive,
      logoKey: data.logoKey || null,
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
    };
    const previous = id ? await db.brand.findUnique({ where: { id }, select: { logoKey: true } }) : null;
    const saved = id
      ? await db.brand.update({ where: { id }, data: values, select: { id: true } })
      : await db.brand.create({ data: values, select: { id: true } });
    await cleanupReplacedImage(previous?.logoKey, values.logoKey);
    invalidate(TAGS.catalog);
    revalidatePath("/admin/brands");
    return ok(saved);
  } catch (err) {
    return toActionError(err, "saveBrand");
  }
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  try {
    await assertStaff();
    const brand = await db.brand.findUnique({ where: { id }, select: { logoKey: true, _count: { select: { products: true } } } });
    if (!brand) throw new UserFacingError("Marque introuvable.");
    if (brand._count.products > 0) throw new UserFacingError(`Impossible : ${brand._count.products} produit(s) utilisent cette marque.`);
    await db.brand.delete({ where: { id } });
    await cleanupReplacedImage(brand.logoKey, null);
    invalidate(TAGS.catalog);
    revalidatePath("/admin/brands");
    return ok(undefined);
  } catch (err) {
    return toActionError(err, "deleteBrand");
  }
}
