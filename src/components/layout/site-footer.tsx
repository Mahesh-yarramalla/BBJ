import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link href="/" className="brand" aria-label="Bake and Bloom By Joe home">
            <span className="brand-name">Bake and Bloom By Joe</span>
            <span className="brand-tagline" style={{ color: "#E5D8C7" }}>A little warmth in every bite</span>
          </Link>
          <p>Handcrafted bakes for everyday moments and special celebrations, made with care in Coimbatore.</p>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link href="/shop">Shop all</Link>
          <Link href="/our-story">Our story</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/delivery-returns">Delivery & returns</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} Bake and Bloom By Joe. Made with care.</div>
    </footer>
  );
}
