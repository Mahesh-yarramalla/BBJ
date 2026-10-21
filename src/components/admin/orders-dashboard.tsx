
"use client";

import { useCallback, useEffect, useState } from "react";

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
] as const;

type OrderStatus = (typeof STATUSES)[number];
type Fulfillment = "DELIVERY" | "PICKUP" | "";

type OrderItem = {
  id: string;
  productName: string;
  variantName: string;
  quantity: number;
  lineTotalPaise: number;
};

type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfillmentType: "DELIVERY" | "PICKUP";
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  scheduledFor: string | null;
  subtotalPaise: number;
  deliveryFeePaise: number;
  discountPaise: number;
  totalPaise: number;
  createdAt: string;
  items: OrderItem[];
};

type OrdersResponse = {
  orders: Order[];
  filteredCount: number;
  allCount: number;
  summary: Record<OrderStatus, number>;
  limit: number;
  hasMore: boolean;
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

const dateTime = (value: string | null) => {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
};

const statusLabel = (status: string) =>
  status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());


export default function OrdersDashboard() {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [status, setStatus] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (fulfillment) params.set("fulfillment", fulfillment);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const query = params.toString();
      const response = await fetch(
        `/api/admin/orders${query ? `?${query}` : ""}`,
        { credentials: "same-origin", cache: "no-store" },
      );

      if (response.status === 401) {
        window.location.assign("/admin/login");
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load orders.");
      }

      setData(result as OrdersResponse);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load orders.",
      );
    } finally {
      setLoading(false);
    }
  }, [status, fulfillment, from, to]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders, refreshKey]);

  function resetFilters() {
    setStatus("");
    setFulfillment("");
    setFrom("");
    setTo("");
  }

  return (
    <section className="mt-8 space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="All orders" value={data?.allCount ?? 0} />
        <SummaryCard label="Pending" value={data?.summary.PENDING ?? 0} />
        <SummaryCard
          label="In progress"
          value={
            (data?.summary.CONFIRMED ?? 0) +
            (data?.summary.PREPARING ?? 0) +
            (data?.summary.READY_FOR_PICKUP ?? 0) +
            (data?.summary.OUT_FOR_DELIVERY ?? 0)
          }
        />
        <SummaryCard
          label="Completed"
          value={data?.summary.COMPLETED ?? 0}
        />
      </div>

      <div className="rounded-2xl border border-[#E5D8C7] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#49382D]">
              Orders
            </h2>
            <p className="mt-1 text-sm text-[#49382D]/65">
              {data
                ? `${data.filteredCount} matching orders`
                : "Loading order information..."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
            className="rounded-lg border border-[#E5D8C7] px-4 py-2 text-sm font-medium text-[#49382D] hover:bg-[#F6F0E6] disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-[#49382D]">
            Order status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#E5D8C7] bg-white px-3 py-2.5"
            >
              <option value="">All statuses</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {statusLabel(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-[#49382D]">
            Fulfillment
            <select
              value={fulfillment}
              onChange={(e) => setFulfillment(e.target.value as Fulfillment)}
              className="mt-1.5 w-full rounded-lg border border-[#E5D8C7] bg-white px-3 py-2.5"
            >
              <option value="">Delivery and pickup</option>
              <option value="DELIVERY">Delivery</option>
              <option value="PICKUP">Pickup</option>
            </select>
          </label>

          <label className="text-sm font-medium text-[#49382D]">
            Created from
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#E5D8C7] bg-white px-3 py-2.5"
            />
          </label>

          <label className="text-sm font-medium text-[#49382D]">
            Created to
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#E5D8C7] bg-white px-3 py-2.5"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            className="rounded-lg bg-[#68765A] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-[#E5D8C7] px-4 py-2 text-sm font-medium text-[#49382D] hover:bg-[#F6F0E6]"
          >
            Clear filters
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#E5D8C7] bg-white">
        {loading && !data ? (
          <p className="p-8 text-center text-sm text-[#49382D]/70">
            Loading orders...
          </p>
        ) : data && data.orders.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#F6F0E6] text-[#49382D]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Order</th>
                    <th className="px-5 py-4 font-semibold">Customer</th>
                    <th className="px-5 py-4 font-semibold">Fulfillment</th>
                    <th className="px-5 py-4 font-semibold">Scheduled for</th>
                    <th className="px-5 py-4 font-semibold">Total</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5D8C7]">
                  {data.orders.map((order) => (
                    <tr key={order.id} className="align-top hover:bg-[#F6F0E6]/50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#49382D]">
                          {order.orderNumber}
                        </p>
                        <a
                        href={`/admin/orders/${order.id}`}
                        className="mt-2 inline-block text-xs font-medium text-[#68765A] hover:underline"
                        >
                            Open order →
                            </a>
                        <p className="mt-1 text-xs text-[#49382D]/60">
                          {dateTime(order.createdAt)}
                        </p>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-medium text-[#68765A]">
                            {order.items.length} line item(s)
                          </summary>
                          <ul className="mt-2 space-y-1 text-xs text-[#49382D]/80">
                            {order.items.map((item) => (
                              <li key={item.id}>
                                {item.productName} ({item.variantName}) ×{" "}
                                {item.quantity} — {money(item.lineTotalPaise)}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-[#49382D]">
                          {order.customerName}
                        </p>
                        <p className="mt-1">{order.customerPhone}</p>
                        {order.customerEmail && (
                          <p className="mt-1 break-all text-xs text-[#49382D]/65">
                            {order.customerEmail}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {order.fulfillmentType === "DELIVERY"
                          ? "Delivery"
                          : "Pickup"}
                      </td>
                      <td className="px-5 py-4">
                        {dateTime(order.scheduledFor)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-[#49382D]">
                        {money(order.totalPaise)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block rounded-full bg-[#F6F0E6] px-3 py-1 text-xs font-medium text-[#49382D]">
                          {statusLabel(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-[#E5D8C7] px-5 py-4 text-sm text-[#49382D]/70">
              Showing {data.orders.length} of {data.filteredCount} matching
              orders.
              {data.hasMore && (
                <span> Refine your filters to narrow the results.</span>
              )}
            </div>
          </>
        ) : (
          <div className="p-10 text-center">
            <h3 className="font-semibold text-[#49382D]">
              No orders found
            </h3>
            <p className="mt-2 text-sm text-[#49382D]/65">
              Try adjusting your filters or clearing them to see all orders.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#E5D8C7] bg-white p-5">
      <p className="text-sm text-[#49382D]/70">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#49382D]">{value}</p>
    </div>
  );
}
