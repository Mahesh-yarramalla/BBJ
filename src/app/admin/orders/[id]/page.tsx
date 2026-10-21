
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import OrderStatusControl from "@/components/admin/order-status-control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function money(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}

function dateTime(value: Date | null) {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function AdminOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      fulfillmentSlot: true,
      deliveryZone: true,
      pickupLocation: true,
    },
  });

  if (!order) notFound();

  return (
    <main className="min-h-screen bg-[#F6F0E6] px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/admin"
          className="inline-flex text-sm font-medium text-[#68765A] hover:underline"
        >
          ← Back to orders
        </Link>

        <header className="rounded-2xl border border-[#E5D8C7] bg-white p-6">
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-[#68765A]">
            Bake and Bloom By Joe
          </p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[#49382D]">
                Order {order.orderNumber}
              </h1>
              <p className="mt-2 text-sm text-[#49382D]/70">
                Placed {dateTime(order.createdAt)}
              </p>
            </div>
            <span className="rounded-full bg-[#F6F0E6] px-3 py-1.5 text-sm font-medium text-[#49382D]">
              {label(order.status)}
            </span>
          </div>
        </header>

        <section className="rounded-2xl border border-[#E5D8C7] bg-white p-6">
          <h2 className="text-lg font-semibold text-[#49382D]">
            Customer details
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[#49382D]/65">Name</dt>
              <dd className="mt-1 font-medium text-[#49382D]">
                {order.customerName}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[#49382D]/65">Phone</dt>
              <dd className="mt-1 font-medium text-[#49382D]">
                {order.customerPhone}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-[#49382D]/65">Email</dt>
              <dd className="mt-1 break-all text-[#49382D]">
                {order.customerEmail || "Not provided"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-[#E5D8C7] bg-white p-6">
          <h2 className="text-lg font-semibold text-[#49382D]">
            Fulfillment details
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[#49382D]/65">Method</dt>
              <dd className="mt-1 font-medium text-[#49382D]">
                {label(order.fulfillmentType)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[#49382D]/65">Scheduled for</dt>
              <dd className="mt-1 font-medium text-[#49382D]">
                {dateTime(order.scheduledFor)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[#49382D]/65">Time slot</dt>
              <dd className="mt-1 text-[#49382D]">
                {order.fulfillmentSlot
                  ? `${order.fulfillmentSlot.label} (${order.fulfillmentSlot.startTime}–${order.fulfillmentSlot.endTime})`
                  : "Not specified"}
              </dd>
            </div>

            {order.fulfillmentType === "DELIVERY" ? (
              <div className="sm:col-span-2">
                <dt className="text-sm text-[#49382D]/65">Delivery address</dt>
                <dd className="mt-1 whitespace-pre-line text-[#49382D]">
                  {[
                    order.deliveryAddress1,
                    order.deliveryAddress2,
                    order.deliveryCity,
                    order.deliveryState,
                    order.deliveryPostcode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "No address recorded"}
                </dd>
              </div>
            ) : (
              <div className="sm:col-span-2">
                <dt className="text-sm text-[#49382D]/65">Pickup location</dt>
                <dd className="mt-1 text-[#49382D]">
                  {order.pickupLocation?.name || "No pickup location recorded"}
                </dd>
                {order.pickupLocation?.addressLine1 && (
                  <p className="mt-1 text-sm text-[#49382D]/70">
                    {[
                      order.pickupLocation.addressLine1,
                      order.pickupLocation.addressLine2,
                      order.pickupLocation.city,
                      order.pickupLocation.postcode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
            )}
            <section className="rounded-2xl border border-[#E5D8C7] bg-white p-6">
              <h2 className="text-lg font-semibold text-[#49382D]">
                Order status
                </h2>
                <p className="mt-2 text-sm text-[#49382D]/70">
                Review the order before advancing it to the next stage.
                </p>
                <div className="mt-4">
                  <OrderStatusControl
                  orderId={order.id}
                  currentStatus={order.status}
                  fulfillmentType={order.fulfillmentType}
                  />
                  </div>
                  </section>

            {order.customerNotes && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-[#49382D]/65">Customer notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-[#49382D]">
                  {order.customerNotes}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-2xl border border-[#E5D8C7] bg-white p-6">
          <h2 className="text-lg font-semibold text-[#49382D]">
            Purchased items
          </h2>
          <div className="mt-4 divide-y divide-[#E5D8C7]">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-medium text-[#49382D]">
                    {item.productName}
                  </p>
                  <p className="mt-1 text-sm text-[#49382D]/65">
                    {item.variantName} · {item.quantity} ×{" "}
                    {money(item.unitPricePaise)}
                  </p>
                </div>
                <p className="font-medium text-[#49382D]">
                  {money(item.lineTotalPaise)}
                </p>
              </div>
            ))}
          </div>

          <dl className="mt-4 space-y-3 border-t border-[#E5D8C7] pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[#49382D]/70">Subtotal</dt>
              <dd>{money(order.subtotalPaise)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#49382D]/70">Delivery fee</dt>
              <dd>{money(order.deliveryFeePaise)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#49382D]/70">Discount</dt>
              <dd>−{money(order.discountPaise)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-[#E5D8C7] pt-3 text-base font-semibold text-[#49382D]">
              <dt>Total</dt>
              <dd>{money(order.totalPaise)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
