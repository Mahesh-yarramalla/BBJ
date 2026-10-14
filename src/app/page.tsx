import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, Croissant, Heart, Wheat } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

const categories = [
  {
    name: "Breads & Croissants",
    caption: "Explore the collection ↗",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=85",
    alt: "Fresh artisan bread and pastries",
  },
  {
    name: "Cakes",
    caption: "Made for your moments ↗",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=85",
    alt: "Decorated celebration cake",
  },
  {
    name: "Cookies & Brownies",
    caption: "Little everyday treats ↗",
    image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=85",
    alt: "Freshly baked cookies",
  },
  {
    name: "Pastries & Desserts",
    caption: "Find a new favorite ↗",
    image: "https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=900&q=85",
    alt: "Assorted artisan pastries",
  },
];

const featured = [
  { name: "Classic Cinnamon Rolls", description: "Soft, swirled, and baked with care." },
  { name: "Fudgy Chocolate Brownies", description: "Rich chocolate in every bite." },
  { name: "Everyday Sourdough", description: "A golden crust and tender crumb." },
  { name: "Celebration Cake", description: "A little something for your big day." },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="eyebrow">Small batches · Big heart</div>
            <h1>A little warmth in every bite.</h1>
            <p className="hero-copy">
              From morning breads to celebration cakes, discover thoughtfully made bakes for your everyday moments and your most special ones.
            </p>
            <div className="hero-actions">
              <Link href="/shop" className="button button-primary">Shop all bakes <ArrowRight size={17} /></Link>
              <Link href="/our-story" className="button button-secondary">Our story <ArrowDownRight size={16} /></Link>
            </div>
            <div className="hero-note">
              <span>Made with care</span>
              <span>Delivery in Coimbatore</span>
              <span>Direct pickup available</span>
            </div>
          </div>
          <div className="hero-image-wrap">
            <Image
              className="hero-image"
              src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1400&q=90"
              alt="Rustic artisan bread freshly baked and ready to share"
              fill
              priority
              sizes="(max-width: 720px) 100vw, 52vw"
              style={{ objectFit: "cover" }}
            />
            <div className="image-note">A little something fresh, baked with love.</div>
          </div>
        </div>
      </section>

      <section className="category-section" aria-labelledby="categories-heading">
        <div className="container">
          <div className="section-top">
            <SectionHeading eyebrow="Made fresh with care" title="Find your kind of comfort" description="Something lovely for every craving." />
            <Link href="/shop" className="text-link">Explore everything <ArrowRight size={15} style={{ display: "inline", verticalAlign: "middle" }} /></Link>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <Link href={`/shop?category=${encodeURIComponent(category.name)}`} className="category-card" key={category.name}>
                <div style={{ position: "relative", aspectRatio: "4 / 4.3", overflow: "hidden", borderRadius: 8, background: "#E5D8C7" }}>
                  <Image src={category.image} alt={category.alt} fill sizes="(max-width: 720px) 45vw, 25vw" style={{ objectFit: "cover" }} />
                </div>
                <h3 className="category-title">{category.name}</h3>
                <span className="category-caption">{category.caption}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="featured-section">
        <div className="container">
          <div className="section-top">
            <SectionHeading eyebrow="A few customer favorites" title="Good things, made daily" description="A first look at the treats our shop will bring together." />
            <Link href="/shop" className="text-link">Shop all bakes <ArrowRight size={15} style={{ display: "inline", verticalAlign: "middle" }} /></Link>
          </div>
          <div className="product-placeholder-grid">
            {featured.map((product, index) => (
              <article className="product-placeholder" key={product.name}>
                <div className="product-placeholder-image" aria-hidden="true">
                  {index % 2 === 0 ? <Croissant size={42} strokeWidth={1.2} /> : index === 1 ? <Heart size={42} strokeWidth={1.2} /> : <Wheat size={42} strokeWidth={1.2} />}
                </div>
                <div className="product-placeholder-body">
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <span className="placeholder-price">Price to be configured</span>
                  <br />
                  <span className="demo-label">Preview item</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="story-section">
        <div className="container story-inner">
          <div>
            <div className="eyebrow">A note from our kitchen</div>
            <h2 className="story-heading">Thoughtfully baked. Happily shared.</h2>
          </div>
          <div>
            <p className="story-copy">
              We believe the best bakes make ordinary days feel special. Bake and Bloom By Joe brings together comforting classics, celebration favorites, and little treats worth slowing down for.
            </p>
            <p className="story-copy">Made with care in Coimbatore, ready for local delivery or direct pickup.</p>
            <Link href="/our-story" className="button button-secondary" style={{ marginTop: 10, borderColor: "rgba(255,255,255,.6)", color: "white" }}>Get to know us <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
