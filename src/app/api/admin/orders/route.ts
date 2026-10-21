
import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, FulfillmentType, Prisma } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validStatuses = new Set<string>(Object.values(OrderStatus));
const validFulfillmentTypes = new Set<string>(
  Object.values(FulfillmentType),
);

function parseDate(value: string | null, endOfDay = false): Date | null {
  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  // Interpret dashboard dates in India Standard Time.
  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+05:30`,
  );

  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const fulfillment = params.get("fulfillment");
    const from = params.get("from");
    const to = params.get("to");

    if (status && !validStatuses.has(status)) {
      return NextResponse.json(
        { error: "Invalid order status." },
        { status: 400 },
      );
    }

    if (fulfillment && !validFulfillmentTypes.has(fulfillment)) {
      return NextResponse.json(
        { error: "Invalid fulfillment type." },
        { status: 400 },
      );
    }

    const fromDate = parseDate(from);
    const toDate = parseDate(to, true);

    if ((from && !fromDate) || (to && !toDate)) {
      return NextResponse.json(
        { error: "Dates must use YYYY-MM-DD format." },
        { status: 400 },
      );
    }

    if (fromDate && toDate && fromDate > toDate) {
      return NextResponse.json(
        { error: "The start date must not be after the end date." },
        { status: 400 },
      );
    }

    const where: Prisma.OrderWhereInput = {
      ...(status ? { status: status as OrderStatus } : {}),
      ...(fulfillment
        ? { fulfillmentType: fulfillment as FulfillmentType }
        : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const [orders, filteredCount, statusCounts, allCount] =
      await Promise.all([
        prisma.order.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            fulfillmentType: true,
            customerName: true,
            customerPhone: true,
            customerEmail: true,
            scheduledFor: true,
            subtotalPaise: true,
            deliveryFeePaise: true,
            discountPaise: true,
            totalPaise: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                productName: true,
                variantName: true,
                quantity: true,
                lineTotalPaise: true,
              },
            },
          },
        }),
        prisma.order.count({ where }),
        prisma.order.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        prisma.order.count(),
      ]);

    const summary = Object.fromEntries(
      Object.values(OrderStatus).map((value) => [value, 0]),
    ) as Record<OrderStatus, number>;

    for (const entry of statusCounts) {
      summary[entry.status] = entry._count._all;
    }

    return NextResponse.json({
      orders,
      filteredCount,
      allCount,
      summary,
      limit: 50,
      hasMore: filteredCount > orders.length,
    });
  } catch (error) {
    console.error("Admin orders API failed:", error);

    return NextResponse.json(
      { error: "Unable to load orders right now." },
      { status: 500 },
    );
  }
}
