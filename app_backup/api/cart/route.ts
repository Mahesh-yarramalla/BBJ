import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("items" in body) || !Array.isArray(body.items))
      return NextResponse.json({ error: "Invalid cart payload." }, { status: 400 });
    if (body.items.length > 50)
      return NextResponse.json({ error: "A cart can contain at most 50 different items." }, { status: 400 });

    const quantities = new Map<string, number>();
    for (const item of body.items as unknown[]) {
      if (!item || typeof item !== "object" || !("variantId" in item) || !("quantity" in item) ||
          typeof item.variantId !== "string" || !item.variantId.trim() ||
          typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)
        return NextResponse.json({ error: "Each item needs a valid variant and quantity (1–99)." }, { status: 400 });
      quantities.set(item.variantId, Math.min(99, (quantities.get(item.variantId) ?? 0) + item.quantity));
    }
    const ids = [...quantities.keys()];
    if (!ids.length) return NextResponse.json({ items: [] });
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: ids }, isActive: true, product: { isActive: true, category: { isActive: true } } },
      include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));
    const items = ids.map((variantId) => {
      const v = byId.get(variantId);
      const quantity = quantities.get(variantId)!;
      if (!v) return { variantId, quantity, unavailable: true as const, message: "This item is no longer available. Remove it from your bag." };
      return {
        variantId: v.id, quantity, unavailable: false as const, productName: v.product.name, productSlug: v.product.slug,
        image: v.product.images[0]?.url ?? v.product.imageUrl, imageAlt: v.product.images[0]?.altText ?? v.product.imageAlt,
        variantName: v.name, sku: v.sku, unit: v.unit, pricePaise: v.pricePaise, stockQuantity: v.stockQuantity,
        lineTotalPaise: v.pricePaise * quantity, inStock: v.stockQuantity >= quantity,
      };
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Unable to validate cart:", error);
    return NextResponse.json({ error: "We couldn’t check your bag right now. Please try again." }, { status: 500 });
  }
}
