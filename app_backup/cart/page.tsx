"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatINR } from "@/lib/demo-products";

const CART_KEY = "bake-and-bloom-cart";
type StoredItem = { variantId: string; quantity: number };
type AvailableItem = {
  variantId: string; quantity: number; unavailable?: false; inStock: boolean; productName: string; productSlug: string;
  image: string; imageAlt: string; variantName: string; unit: string; pricePaise: number; stockQuantity: number; lineTotalPaise: number;
};
type UnavailableItem = { variantId: string; quantity: number; unavailable: true; message: string };
type CartLine = AvailableItem | UnavailableItem;
function readCart(): StoredItem[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is StoredItem => !!v && typeof v.variantId === "string" &&
      Number.isInteger(v.quantity) && v.quantity >= 1 && v.quantity <= 99);
  } catch { return []; }
}
export default function CartPage() {
  const [stored, setStored] = useState<StoredItem[]>([]);
  const [items, setItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async (cart: StoredItem[]) => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart }), cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to validate your bag.");
      setItems(data.items ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to validate your bag."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const cart = readCart(); setStored(cart); void refresh(cart); }, [refresh]);
  function save(next: StoredItem[]) { setStored(next); localStorage.setItem(CART_KEY, JSON.stringify(next)); void refresh(next); }
  function remove(id: string) { save(stored.filter((v) => v.variantId !== id)); }
  function quantity(id: string, value: number) {
    if (value < 1) return remove(id);
    save(stored.map((v) => v.variantId === id ? { ...v, quantity: Math.min(99, value) } : v));
  }
  const available = items.filter((v): v is AvailableItem => !v.unavailable);
  const subtotal = available.reduce((sum, v) => sum + v.lineTotalPaise, 0);
  const blocked = items.some((v) => v.unavailable || !v.inStock);
  return <section className="cart-section"><div className="container">
    <Link href="/shop" className="back-to-shop"><ArrowLeft size={16} /> Continue shopping</Link>
    <div className="cart-heading"><div className="eyebrow">Your selection</div><h1 className="section-heading">Your bag</h1><p className="section-subtitle">A few good things, freshly baked with care.</p></div>
    {error && <div className="cart-alert" role="alert">{error} <button type="button" onClick={() => void refresh(stored)}>Try again</button></div>}
    {loading ? <div className="cart-empty"><p>Checking availability and current prices…</p></div> : items.length === 0 ?
      <div className="cart-empty"><div className="cart-empty-icon"><ShoppingBag size={27} /></div><h2>Your bag is waiting for something lovely</h2><p>Explore our cakes, breads, cookies, and pastries to find your next favorite.</p><Link href="/shop" className="button button-primary">Explore the bake shop</Link></div> :
      <div className="cart-layout"><div className="cart-lines">{items.map((item) => item.unavailable ?
        <article className="cart-line cart-line-unavailable" key={item.variantId}><div className="cart-line-copy"><strong>Item unavailable</strong><p>{item.message}</p></div><button className="cart-remove" type="button" onClick={() => remove(item.variantId)}><Trash2 size={16} /> Remove</button></article> :
        <article className="cart-line" key={item.variantId}>
          <Link href={`/shop/${item.productSlug}`} className="cart-line-image"><Image src={item.image} alt={item.imageAlt} fill sizes="120px" /></Link>
          <div className="cart-line-copy"><div className="eyebrow">{item.variantName}</div><h2><Link href={`/shop/${item.productSlug}`}>{item.productName}</Link></h2><p>{formatINR(item.pricePaise)} / {item.unit}</p>
            {item.stockQuantity < 1 ? <p className="cart-stock-error">Currently out of stock.</p> : !item.inStock ? <p className="cart-stock-error">Only {item.stockQuantity} available. Reduce the quantity to continue.</p> : null}
            <div className="cart-line-actions"><div className="quantity-control" aria-label={`Quantity for ${item.productName}`}>
              <button type="button" aria-label="Decrease quantity" onClick={() => quantity(item.variantId, item.quantity - 1)}><Minus size={15} /></button><span>{item.quantity}</span>
              <button type="button" aria-label="Increase quantity" disabled={item.quantity >= 99 || item.quantity >= item.stockQuantity} onClick={() => quantity(item.variantId, item.quantity + 1)}><Plus size={15} /></button>
            </div><button className="cart-remove" type="button" onClick={() => remove(item.variantId)}><Trash2 size={15} /> Remove</button></div>
          </div><strong className="cart-line-total">{formatINR(item.lineTotalPaise)}</strong>
        </article>)}</div>
        <aside className="cart-summary"><h2>Order summary</h2><div className="cart-summary-row"><span>Subtotal</span><strong>{formatINR(subtotal)}</strong></div>
          <div className="cart-summary-row"><span>Delivery</span><span>Calculated at checkout</span></div><div className="cart-summary-total"><span>Estimated total</span><strong>{formatINR(subtotal)}</strong></div>
          {blocked && <p className="cart-stock-error">Resolve unavailable or out-of-stock items before checkout.</p>}
          <button className="button button-primary cart-checkout-button" type="button" disabled>Checkout coming next</button>
          <p className="cart-summary-note">Final availability, delivery fee, and fulfillment options will be confirmed before an order is placed.</p>
        </aside></div>}
  </div></section>;
}
