import { Search, ShoppingBag } from "lucide-react";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Bake and Bloom By Joe home">
          <span className="brand-name">Bake and Bloom By Joe</span>
          <span className="brand-tagline">Baked with care</span>
        </Link>

        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/shop">Shop all</Link>
          <Link href="/shop?category=cakes">Cakes</Link>
          <Link href="/shop?category=breads">Breads</Link>
          <Link href="/shop?category=pastries">Pastries</Link>
          <Link href="/our-story">Our story</Link>
        </nav>

        <div className="header-actions">
          <Link href="/shop" aria-label="Search products"><Search size={19} strokeWidth={1.7} /></Link>
          <Link href="/account" className="account-link">Account</Link>
          <Link href="/cart" className="cart-link" aria-label="Shopping bag">
            <ShoppingBag size={19} strokeWidth={1.7} />
            <span>Bag</span>
          </Link>
          <Link href="/shop" className="mobile-nav">Shop <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </header>
  );
}
