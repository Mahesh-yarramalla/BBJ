"use client";
import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";

const CART_KEY = "bake-and-bloom-cart";
export function AddToCartButton({ variantId, stockQuantity }: { variantId: string; stockQuantity: number }) {
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);
  function addToCart() {
    try {
      const cart: { variantId: string; quantity: number }[] = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
      const existing = cart.find((item) => item.variantId === variantId);
      const nextQuantity = (existing?.quantity ?? 0) + 1;
      if (nextQuantity > stockQuantity) {
        setMessage(stockQuantity > 0 ? `Only ${stockQuantity} available right now.` : "Currently out of stock.");
        setAdded(false);
        return;
      }
      if (existing) existing.quantity = nextQuantity;
      else cart.push({ variantId, quantity: 1 });
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      setMessage("Added to your bag.");
      setAdded(true);
    } catch {
      setMessage("We couldn’t update your bag. Please try again.");
      setAdded(false);
    }
  }
  return <div className="add-to-cart-wrap">
    <button type="button" className="button button-primary" onClick={addToCart} disabled={stockQuantity <= 0}>
      {added ? <Check size={17} /> : <ShoppingBag size={17} />}
      {stockQuantity <= 0 ? "Out of stock" : added ? "Add one more" : "Add to bag"}
    </button>
    {message && <p className={`cart-inline-message ${added ? "is-success" : ""}`} role="status">{message}</p>}
  </div>;
}
