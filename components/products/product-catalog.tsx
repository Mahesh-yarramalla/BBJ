"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, SlidersHorizontal, ArrowUpDown, Clock3, ArrowRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatINR } from "@/lib/demo-products";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog-types";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

type SortOption = "featured" | "price-asc" | "price-desc" | "name";
type ProductCatalogProps = {
  initialCategory?: string;
  products: CatalogProduct[];
  categories: CatalogCategory[];
};

function normalizeCategory(value: string, categories: CatalogCategory[]) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "breads & croissants") {
    return categories.find((item) => item.name.toLowerCase() === "breads")?.name ?? "Breads";
  }
  return categories.find((item) => item.name.toLowerCase() === normalized)?.name ?? "All bakes";
}

export function ProductCatalog({
  initialCategory = "All bakes",
  products,
  categories,
}: ProductCatalogProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(() => normalizeCategory(initialCategory, categories));
  const [sort, setSort] = useState<SortOption>("featured");

  useEffect(() => {
    setCategory(normalizeCategory(initialCategory, categories));
  }, [initialCategory, categories]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const results = products.filter((product) => {
      const matchesCategory = category === "All bakes" || product.category === category;
      const searchable = `${product.name} ${product.description} ${product.category} ${product.tags.join(" ")}`.toLowerCase();
      return matchesCategory && (!query || searchable.includes(query));
    });

    return [...results].sort((a, b) => {
      if (sort === "price-asc") return a.pricePaise - b.pricePaise;
      if (sort === "price-desc") return b.pricePaise - a.pricePaise;
      if (sort === "name") return a.name.localeCompare(b.name);
      return Number(b.featured) - Number(a.featured);
    });
  }, [category, products, search, sort]);

  function clearFilters() {
    setSearch("");
    setCategory("All bakes");
    setSort("featured");
  }

  return (
    <div className="catalog-layout">
      <aside className="catalog-sidebar" aria-label="Product filters">
        <div className="catalog-sidebar-heading"><SlidersHorizontal size={17} /> <span>Find your bake</span></div>
        <label className="field-label" htmlFor="catalog-search">Search products</label>
        <div className="catalog-search-wrap">
          <Search size={17} aria-hidden="true" />
          <input id="catalog-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try chocolate…" />
          {search && <button type="button" className="icon-clear" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}
        </div>

        <fieldset className="category-filter">
          <legend>Categories</legend>
          <button type="button" className={`filter-option ${category === "All bakes" ? "is-selected" : ""}`} onClick={() => setCategory("All bakes")}>
            <span>All bakes</span><span>{products.length}</span>
          </button>
          {categories.map((item) => (
            <button type="button" key={item.slug} className={`filter-option ${category === item.name ? "is-selected" : ""}`} onClick={() => setCategory(item.name)}>
              <span>{item.name}</span><span>{item.count}</span>
            </button>
          ))}
        </fieldset>

        <div className="catalog-note">
          <strong>Made for Coimbatore</strong>
          <p>Choose local delivery or direct pickup at checkout. Availability and fees will be confirmed when ordering is enabled.</p>
        </div>
      </aside>

      <section className="catalog-results" aria-label="Bakery products">
        <div className="catalog-toolbar">
          <p className="catalog-result-count"><strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? "bake" : "bakes"} to explore</p>
          <label className="sort-control" htmlFor="catalog-sort"><ArrowUpDown size={16} /><span>Sort by</span>
            <select id="catalog-sort" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </label>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="catalog-product-grid">
            {filteredProducts.map((product) => (
              <article className="catalog-product-card" key={product.id}>
                <Link className="catalog-product-image" href={`/shop/${product.slug}`} aria-label={`View ${product.name}`}>
                  <Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 620px) 46vw, (max-width: 1000px) 42vw, 28vw" />
                  {product.featured && <span className="product-ribbon">A favorite</span>}
                </Link>
                <div className="catalog-product-body">
                  <div className="product-category-label">{product.category}</div>
                  <h2><Link href={`/shop/${product.slug}`}>{product.name}</Link></h2>
                  <p>{product.description}</p>
                  <div className="catalog-product-bottom">
                    <div><strong>{formatINR(product.pricePaise)}</strong><span className="product-unit"> / {product.unit}</span></div>
                    <div className="catalog-card-actions"><AddToCartButton variantId={product.variantId} stockQuantity={product.stockQuantity} /><Link className="product-view-link" href={`/shop/${product.slug}`} aria-label={`View details for ${product.name}`}><ArrowRight size={18} /></Link></div>
                  </div>
                  <div className="prep-note"><Clock3 size={13} /> Preparation: {product.preparationHours}h</div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="catalog-empty">
            <div className="catalog-empty-icon"><Search size={25} /></div>
            <h2>No bakes found</h2>
            <p>Try another search or clear your filters to see the full collection.</p>
            <button className="button button-primary" type="button" onClick={clearFilters}>Clear filters</button>
          </div>
        )}

        <p className="demo-data-disclaimer">Catalog data is loaded from the database. Confirm sample names, prices, photos, stock, and preparation times before launch.</p>
      </section>
    </div>
  );
}
