import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, MapPin } from "lucide-react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/demo-products";

export const dynamic = "force-dynamic";

type ProductPageProps = { params: Promise<{ slug: string }> };

async function getProduct(slug: string) {
  return prisma.product.findFirst({
    where: {
      slug,
      isActive: true,
      category: { isActive: true },
      variants: { some: { isActive: true } },
    },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
      images: { orderBy: { position: "asc" } },
    },
  });
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const product = await getProduct(slug);
    if (!product) return { title: "Product not found" };
    return { title: product.name, description: product.description };
  } catch (error) {
    console.error("Unable to load product metadata:", error);
    return { title: "Bake and Bloom By Joe" };
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  let product;
  try {
    product = await getProduct(slug);
  } catch (error) {
    console.error("Unable to load product from PostgreSQL:", error);
    return (
      <section className="product-detail-section">
        <div className="container">
          <div className="catalog-empty" role="alert">
            <h1>We couldn’t load this bake</h1>
            <p>Please return to the shop and try again shortly.</p>
            <Link href="/shop" className="button button-primary">Back to the bake shop</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!product || product.variants.length === 0) notFound();

  const variant = product.variants[0];
  const image = product.images[0];
  const imageUrl = image?.url ?? product.imageUrl;
  const imageAlt = image?.altText ?? product.imageAlt;

  return (
    <section className="product-detail-section">
      <div className="container">
        <Link href="/shop" className="back-to-shop"><ArrowLeft size={16} /> Back to all bakes</Link>
        <div className="product-detail-grid">
          <div className="product-detail-image">
            <Image src={imageUrl} alt={imageAlt} fill priority sizes="(max-width: 760px) 100vw, 52vw" />
          </div>
          <div className="product-detail-copy">
            <div className="eyebrow">{product.category.name}</div>
            <h1>{product.name}</h1>
            <div className="product-detail-price">{formatINR(variant.pricePaise)} <span>/ {variant.unit}</span></div>
            <p className="product-detail-description">{product.description}</p>
            <div className="product-detail-info"><Clock3 size={17} /><span>Example preparation time: {product.preparationHours} hours</span></div>
            <div className="product-detail-info"><MapPin size={17} /><span>Planned for Coimbatore delivery or direct pickup.</span></div>
            <div className="product-detail-purchase">
              <AddToCartButton variantId={variant.id} stockQuantity={variant.stockQuantity} />
              <Link href="/cart" className="button button-secondary">View bag</Link>
            </div>
            {variant.stockQuantity > 0
              ? <p className="product-stock-note">{variant.stockQuantity} currently available</p>
              : <p className="product-stock-note product-stock-error">Currently out of stock</p>}
            <p className="demo-data-disclaimer">Sample price and preparation time. Confirm all product details before launch.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
