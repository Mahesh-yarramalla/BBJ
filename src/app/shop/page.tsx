import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductCatalog } from "@/components/products/product-catalog";
import { SectionHeading } from "@/components/ui/section-heading";
import { prisma } from "@/lib/prisma";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop all bakes",
  description:
    "Explore cakes, breads, cookies, brownies, pastries and more from Bake and Bloom By Joe in Coimbatore.",
};

type ShopPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const requestedCategory = params.category ?? "All bakes";

  try {
    const [dbCategories, dbProducts] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.product.findMany({
        where: {
          isActive: true,
          variants: { some: { isActive: true } },
          category: { isActive: true },
        },
        include: {
          category: true,
          variants: {
            where: { isActive: true },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          },
          images: { orderBy: { position: "asc" } },
        },
        orderBy: [{ featured: "desc" }, { name: "asc" }],
      }),
    ]);

    const products: CatalogProduct[] = dbProducts.flatMap((product) => {
      const variant = product.variants[0];
      if (!variant) return [];

      const firstImage = product.images[0];
      return [{
        id: product.id,
        variantId: variant.id,
        stockQuantity: variant.stockQuantity,
        slug: product.slug,
        name: product.name,
        category: product.category.name,
        description: product.description,
        pricePaise: variant.pricePaise,
        unit: variant.unit,
        image: firstImage?.url ?? product.imageUrl,
        imageAlt: firstImage?.altText ?? product.imageAlt,
        preparationHours: product.preparationHours,
        featured: product.featured,
        tags: product.tags,
      }];
    });

    const categories: CatalogCategory[] = dbCategories.map((category) => ({
      name: category.name,
      slug: category.slug,
      count: products.filter((product) => product.category === category.name).length,
    }));

    return (
      <>
        <section className="shop-hero">
          <div className="container">
            <div className="eyebrow">From our kitchen to your table</div>
            <SectionHeading
              title="The bake shop"
              description="Comforting classics, celebration favorites, and little treats worth slowing down for."
            />
            <div className="shop-service-note">
              <span className="service-dot" /> Serving Coimbatore with local delivery and direct pickup
            </div>
          </div>
        </section>
        <section className="shop-catalog-section">
          <div className="container">
            <Suspense fallback={<div className="catalog-loading">Preparing the bake shop…</div>}>
              <ProductCatalog
                initialCategory={requestedCategory}
                products={products}
                categories={categories}
              />
            </Suspense>
          </div>
        </section>
      </>
    );
  } catch (error) {
    console.error("Unable to load the bakery catalog from PostgreSQL:", error);
    return (
      <section className="shop-catalog-section">
        <div className="container">
          <div className="catalog-empty" role="alert">
            <h2>Our bake shop is taking a short break</h2>
            <p>We couldn’t load the catalog just now. Please try again shortly.</p>
          </div>
        </div>
      </section>
    );
  }
}
