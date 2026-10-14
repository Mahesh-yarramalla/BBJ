import { PrismaClient } from "@prisma/client";
import { bakeryCategories, demoProducts } from "../src/lib/demo-products";

const prisma = new PrismaClient();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const categoryIds = new Map<string, string>();

  for (const [index, name] of bakeryCategories.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: { name, sortOrder: index, isActive: true },
      create: {
        name,
        slug: slugify(name),
        sortOrder: index,
        isActive: true,
      },
    });
    categoryIds.set(name, category.id);
  }

  for (const product of demoProducts) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`Missing category for ${product.name}`);

    const savedProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        categoryId,
        imageUrl: product.image,
        imageAlt: product.imageAlt,
        preparationHours: product.preparationHours,
        featured: Boolean(product.featured),
        tags: product.tags,
        isActive: true,
      },
      create: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        categoryId,
        imageUrl: product.image,
        imageAlt: product.imageAlt,
        preparationHours: product.preparationHours,
        featured: Boolean(product.featured),
        tags: product.tags,
        isActive: true,
      },
    });

    await prisma.productVariant.upsert({
      where: { sku: product.id.toUpperCase() },
      update: {
        productId: savedProduct.id,
        name: "Default",
        unit: product.unit,
        pricePaise: product.pricePaise,
        isDefault: true,
        isActive: true,
      },
      create: {
        productId: savedProduct.id,
        sku: product.id.toUpperCase(),
        name: "Default",
        unit: product.unit,
        pricePaise: product.pricePaise,
        stockQuantity: 10,
        isDefault: true,
        isActive: true,
      },
    });

    await prisma.productImage.upsert({
      where: { id: `seed-image-${product.id}` },
      update: {
        productId: savedProduct.id,
        url: product.image,
        altText: product.imageAlt,
        position: 0,
      },
      create: {
        id: `seed-image-${product.id}`,
        productId: savedProduct.id,
        url: product.image,
        altText: product.imageAlt,
        position: 0,
      },
    });
  }

  // These settings remain inactive until real delivery postcodes, fees,
  // pickup details, opening hours, and fulfillment slots are configured.
  await prisma.deliveryZone.upsert({
    where: { id: "coimbatore-city-default" },
    update: { name: "Coimbatore City", city: "Coimbatore", state: "Tamil Nadu", country: "India" },
    create: {
      id: "coimbatore-city-default",
      name: "Coimbatore City",
      city: "Coimbatore",
      state: "Tamil Nadu",
      country: "India",
      isActive: false,
      deliveryFeePaise: 0,
      minOrderPaise: 0,
    },
  });

  console.log(`Seed complete: ${bakeryCategories.length} categories and ${demoProducts.length} sample products.`);
  console.log("IMPORTANT: Seed prices, stock, products and preparation times are examples. Review them before launch.");
  console.log("Delivery and pickup settings remain inactive until real business details are configured.");
}

main()
  .catch((error) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
