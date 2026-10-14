import Link from "next/link";
import { CheckCircle2, PackageCheck } from "lucide-react";

export default async function OrderConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  return <section className="checkout-section"><div className="container"><div className="order-confirmation">
    <div className="order-confirmation-icon"><CheckCircle2 size={34} /></div>
    <div className="eyebrow">Order received</div><h1 className="section-heading">Thank you for your order.</h1>
    <p>Your order request has been saved. Keep this order number for your records.</p>
    <div className="order-number"><span>Order number</span><strong>{orderNumber}</strong></div>
    <p className="checkout-hint"><PackageCheck size={16} /> Payment has not been collected online. The bakery can confirm your order and fulfillment details separately.</p>
    <Link href="/shop" className="button button-primary">Continue shopping</Link>
  </div></div></section>;
}
