
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

type Props = {
  orderId: string;
  currentStatus: OrderStatus;
  fulfillmentType: "DELIVERY" | "PICKUP";
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "COMPLETED",
  OUT_FOR_DELIVERY: "COMPLETED",
};

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OrderStatusControl({
  orderId,
  currentStatus,
  fulfillmentType,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const nextStatus =
    currentStatus === "PREPARING" && fulfillmentType === "DELIVERY"
      ? "OUT_FOR_DELIVERY"
      : NEXT_STATUS[currentStatus];

  const canCancel =
    currentStatus === "PENDING" || currentStatus === "CONFIRMED";

  async function submitStatus(status: OrderStatus, confirmation: string) {
    if (busy) return;

    if (!window.confirm(confirmation)) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/status`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );

      const result = await response.json();

      if (response.status === 401) {
        window.location.assign("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || "Unable to update order status.");
      }

      setSuccess(
        status === "CANCELLED"
          ? "Order cancelled and inventory restored."
          : `Order updated to ${label(status)}.`,
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update order status.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!nextStatus && !canCancel) {
    return (
      <p className="text-sm text-[#49382D]/65">
        No further status changes are available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {nextStatus && (
        <>
          <p className="text-sm text-[#49382D]/70">
            Next status: <strong>{label(nextStatus)}</strong>
          </p>

          <button
            type="button"
            onClick={() =>
              submitStatus(
                nextStatus,
                `Are you sure you want to change this order from ${label(currentStatus)} to ${label(nextStatus)}? This change will be saved to the database.`,
              )
            }
            disabled={busy}
            className="rounded-lg bg-[#68765A] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Updating..." : `Mark as ${label(nextStatus)}`}
          </button>
        </>
      )}

      {canCancel && (
        <div>
          <button
            type="button"
            onClick={() =>
              submitStatus(
                "CANCELLED",
                "Cancel this order? Its inventory will be restored. This action cannot be undone from this screen.",
              )
            }
            disabled={busy}
            className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Updating..." : "Cancel order"}
          </button>
          <p className="mt-1 text-xs text-[#49382D]/60">
            Available only before preparation begins.
          </p>
        </div>
      )}

      {success && (
        <p role="status" className="text-sm text-green-700">
          {success}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
