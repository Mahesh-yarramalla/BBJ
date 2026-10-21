
import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  OrderActionError,
  updateAdminOrderStatus,
} from "@/lib/admin-order-cancellation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}


export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!hasSameOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  if (!id || id.length > 128) {
    return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const next =
    typeof body === "object" &&
    body !== null &&
    "status" in body &&
    typeof body.status === "string"
      ? body.status
      : "";

  if (!Object.values(OrderStatus).includes(next as OrderStatus)) {
    return NextResponse.json(
      { error: "Invalid order status." },
      { status: 400 },
    );
  }

  try {
    const updatedOrder = await updateAdminOrderStatus(
      id,
      next as OrderStatus,
    );

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    if (error instanceof OrderActionError) {
      switch (error.code) {
        case "ORDER_NOT_FOUND":
          return NextResponse.json(
            { error: "Order not found." },
            { status: 404 },
          );

        case "INVALID_TRANSITION":
          return NextResponse.json(
            { error: "This order cannot move to that status." },
            { status: 409 },
          );

        case "CANCELLATION_MOVEMENT_EXISTS":
          return NextResponse.json(
            {
              error:
                "Cancellation inventory movements already exist. Manual review is required.",
            },
            { status: 409 },
          );

        case "ORDER_CHANGED":
          return NextResponse.json(
            {
              error: "The order changed concurrently. Reload and try again.",
            },
            { status: 409 },
          );
      }
    }

    console.error("Admin order status update failed:", error);

    return NextResponse.json(
      { error: "Unable to update order status." },
      { status: 500 },
    );
  }
}
