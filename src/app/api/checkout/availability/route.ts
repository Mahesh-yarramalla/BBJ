
import { NextResponse } from "next/server";
import { FulfillmentType, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BUSINESS_TIME_ZONE = "Asia/Kolkata";
const MAX_ADVANCE_DAYS = 90;

type CartItem = {
  variantId: string;
  quantity: number;
};

function getIndiaDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

function addCalendarDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));

  return [
    result.getUTCFullYear(),
    String(result.getUTCMonth() + 1).padStart(2, "0"),
    String(result.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function getIndiaWeekday(date: string) {
  return new Date(`${date}T12:00:00+05:30`).getUTCDay();
}

function indiaDateTimeToISO(date: string, time: string) {
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00+05:30`));
}

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return jsonError("Invalid availability request.");
    }

    const input = body as Record<string, unknown>;
    const type = input.fulfillmentType;

    if (
      type !== FulfillmentType.DELIVERY &&
      type !== FulfillmentType.PICKUP
    ) {
      return jsonError("Choose delivery or pickup.");
    }

    if (
      !Array.isArray(input.items) ||
      input.items.length < 1 ||
      input.items.length > 50
    ) {
      return jsonError("Add products to your bag before choosing a date.");
    }

    const quantities = new Map<string, number>();

    for (const raw of input.items as unknown[]) {
      if (!raw || typeof raw !== "object") {
        return jsonError("Invalid cart item.");
      }

      const item = raw as Partial<CartItem>;

      if (
        typeof item.variantId !== "string" ||
        !item.variantId ||
        typeof item.quantity !== "number" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        return jsonError("Each cart item needs a valid product and quantity.");
      }

      quantities.set(
        item.variantId,
        (quantities.get(item.variantId) ?? 0) + item.quantity
      );
    }

    if ([...quantities.values()].some((quantity) => quantity > 99)) {
      return jsonError("Maximum quantity per product is 99.");
    }

    const variants = await prisma.productVariant.findMany({
      where: {
        id: { in: [...quantities.keys()] },
        isActive: true,
        product: {
          isActive: true,
          category: { isActive: true },
        },
      },
      select: {
        id: true,
        stockQuantity: true,
        product: {
          select: {
            preparationHours: true,
          },
        },
      },
    });

    if (variants.length !== quantities.size) {
      return jsonError(
        "One or more products are no longer available. Refresh your bag."
      );
    }

    for (const variant of variants) {
      if (
        (quantities.get(variant.id) ?? 0) > variant.stockQuantity
      ) {
        return jsonError("A product has insufficient stock.");
      }
    }

    const maxPreparationHours = Math.max(
      0,
      ...variants.map((variant) => variant.product.preparationHours)
    );

    const now = new Date();
    const nowIndia = getIndiaDateTime(now);
    const latestDate = addCalendarDays(
      nowIndia.date,
      MAX_ADVANCE_DAYS
    );

    const earliestAllowedTime =
      now.getTime() + maxPreparationHours * 60 * 60 * 1000;

    const earliestAllowedMinute =
      Math.ceil(earliestAllowedTime / 60_000) * 60_000;  

    const earliestISO = getIndiaDateTime(
      new Date(earliestAllowedMinute)
    );

    const slots = await prisma.fulfillmentSlot.findMany({
      where: {
        type,
        isActive: true,
      },
      select: {
        id: true,
        label: true,
        startTime: true,
        endTime: true,
        weekdays: true,
        cutOffTime: true,
        capacity: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const dayAfterLatest = addCalendarDays(latestDate, 1);

    const bookedOrders = await prisma.order.findMany({
      where: {
        fulfillmentSlotId: { in: slots.map((slot) => slot.id) },
        scheduledFor: {
          gte: new Date(`${nowIndia.date}T00:00:00+05:30`),
          lt: new Date(`${dayAfterLatest}T00:00:00+05:30`),
        },
        status: { not: OrderStatus.CANCELLED },
      },
      select: {
        fulfillmentSlotId: true,
        scheduledFor: true,
      },
    });

    const bookedBySlotAndDate = new Map<string, number>();

    for (const order of bookedOrders) {
      if (!order.fulfillmentSlotId || !order.scheduledFor) continue;

      const date = getIndiaDateTime(order.scheduledFor).date;
      const key = `${order.fulfillmentSlotId}|${date}`;

      bookedBySlotAndDate.set(
        key,
        (bookedBySlotAndDate.get(key) ?? 0) + 1
      );
    }

    const dates = [];

    for (
      let date = nowIndia.date;
      date <= latestDate;
      date = addCalendarDays(date, 1)
    ) {
      const weekday = getIndiaWeekday(date);
      const availableSlots = [];

      for (const slot of slots) {
        if (
          !/^\d{2}:\d{2}$/.test(slot.startTime) ||
          !/^\d{2}:\d{2}$/.test(slot.endTime) ||
          !/^\d{2}:\d{2}$/.test(slot.cutOffTime) ||
          slot.startTime >= slot.endTime ||
          slot.capacity < 1
        ) {
          continue;
        }

        if (!slot.weekdays.includes(weekday)) continue;

        if (
          date === nowIndia.date &&
          nowIndia.time >= slot.cutOffTime
        ) {
          continue;
        }

        const bookedCount =
          bookedBySlotAndDate.get(`${slot.id}|${date}`) ?? 0;

        if (bookedCount >= slot.capacity) continue;

        // Use the slot start unless preparation requires a later time.
        const scheduledTime =
          date === earliestISO.date &&
          earliestISO.time > slot.startTime
            ? earliestISO.time
            : slot.startTime;

        // The chosen time must still fall inside the configured slot.
        if (
          scheduledTime < slot.startTime ||
          scheduledTime >= slot.endTime
        ) {
          continue;
        }

        const scheduledFor = indiaDateTimeToISO(date, scheduledTime);

        if (new Date(scheduledFor).getTime() < earliestAllowedTime) {
          continue;
        }

        availableSlots.push({
          id: slot.id,
          label: slot.label,
          startTime: slot.startTime,
          endTime: slot.endTime,
          scheduledFor,
          remainingCapacity: slot.capacity - bookedCount,
        });
      }

      if (availableSlots.length > 0) {
        dates.push({
          date,
          label: formatDateLabel(date),
          slots: availableSlots,
        });
      }
    }

    return NextResponse.json(
      {
        fulfillmentType: type,
        preparationHours: maxPreparationHours,
        dates,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Checkout availability error:", error);

    return jsonError(
      "Unable to calculate available fulfillment dates. Please try again.",
      500
    );
  }
}
