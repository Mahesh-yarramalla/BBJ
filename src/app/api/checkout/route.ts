import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { FulfillmentType, InventoryMovementReason, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const POSTCODE = "641004";

const BUSINESS_TIME_ZONE = "Asia/Kolkata";
const MAX_ADVANCE_DAYS = 90;

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

function getIndiaDayBounds(date: string) {
  return {
    start: new Date(`${date}T00:00:00+05:30`),
    end: new Date(`${addCalendarDays(date, 1)}T00:00:00+05:30`),
  };
}

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function getDrivingDistanceMeters(destination: string): Promise<number> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const origin = process.env.DELIVERY_ORIGIN_ADDRESS;
  if (!apiKey || !origin) throw new Error("ROUTING_NOT_CONFIGURED");

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
    },
    body: JSON.stringify({
      origin: { address: origin },
      destination: { address: destination },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      units: "METRIC",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("ROUTING_FAILED");
  const data = (await response.json()) as { routes?: Array<{ distanceMeters?: number }> };
  const meters = data.routes?.[0]?.distanceMeters;
  if (!Number.isFinite(meters) || !meters || meters <= 0) throw new Error("ROUTE_NOT_FOUND");
  return meters;
}

export async function GET() {
  try {
    const [zones, pickupLocations, deliverySlots, pickupSlots] = await Promise.all([
      prisma.deliveryZone.findMany({
        where: { isActive: true, postcodes: { some: { postcode: POSTCODE } } },
        select: { id: true, name: true, deliveryFeePaise: true, minOrderPaise: true },
      }),
      prisma.pickupLocation.findMany({ where: { isActive: true }, select: { id: true, name: true, addressLine1: true, addressLine2: true, city: true, state: true, postcode: true, instructions: true } }),
      prisma.fulfillmentSlot.findMany({ where: { type: FulfillmentType.DELIVERY, isActive: true }, select: { id: true, label: true, startTime: true, endTime: true, weekdays: true, cutOffTime: true, capacity: true } }),
      prisma.fulfillmentSlot.findMany({ where: { type: FulfillmentType.PICKUP, isActive: true }, select: { id: true, label: true, startTime: true, endTime: true, weekdays: true, cutOffTime: true, capacity: true } }),
    ]);
    return NextResponse.json({
      postcode: POSTCODE,
      deliveryEnabled: zones.length > 0 && Boolean(process.env.GOOGLE_MAPS_API_KEY && process.env.DELIVERY_ORIGIN_ADDRESS),
      routingConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY && process.env.DELIVERY_ORIGIN_ADDRESS),
      zones,
      pickupLocations,
      deliverySlots,
      pickupSlots,
      ratePaisePerKm: 3000,
    });
  } catch (error) {
    console.error("Checkout configuration error:", error);
    return jsonError("Checkout options are temporarily unavailable. Please try again.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return jsonError("Invalid checkout request.");
    const b = body as Record<string, unknown>;
    const name = typeof b.customerName === "string" ? b.customerName.trim() : "";
    const phone = typeof b.customerPhone === "string" ? b.customerPhone.trim() : "";
    const email = typeof b.customerEmail === "string" ? b.customerEmail.trim() : "";
    const notes = typeof b.customerNotes === "string" ? b.customerNotes.trim().slice(0, 1000) : null;
    const type = b.fulfillmentType;
    const slotId = typeof b.fulfillmentSlotId === "string" ? b.fulfillmentSlotId : "";
    const cart = b.items;
    if (name.length < 2 || name.length > 120) return jsonError("Enter your full name.");
    if (!/^[+\d()\s-]{8,20}$/.test(phone)) return jsonError("Enter a valid phone number.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Enter a valid email address.");
    if (type !== FulfillmentType.DELIVERY && type !== FulfillmentType.PICKUP) return jsonError("Choose delivery or pickup.");
    if (!Array.isArray(cart) || cart.length < 1 || cart.length > 50) return jsonError("Your bag is empty or contains too many items.");

    const quantities = new Map<string, number>();
    for (const raw of cart as unknown[]) {
      if (!raw || typeof raw !== "object") return jsonError("Invalid cart item.");
      const item = raw as Record<string, unknown>;
      if (typeof item.variantId !== "string" || !item.variantId || typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) return jsonError("Each item needs a valid product and quantity.");
      quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
    }
    if ([...quantities.values()].some((q) => q > 99)) return jsonError("Maximum quantity per product is 99.");
    const ids = [...quantities.keys()];
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: ids }, isActive: true, product: { isActive: true, category: { isActive: true } } },
      include: { product: true },
    });
    if (variants.length !== ids.length) return jsonError("One or more products are no longer available. Refresh your bag.");
    for (const v of variants) if ((quantities.get(v.id) ?? 0) > v.stockQuantity) return jsonError(`${v.product.name} does not have enough stock. Update your bag.`);

    const slot = await prisma.fulfillmentSlot.findFirst({ where: { id: slotId, type, isActive: true } });
    if (!slot) return jsonError("That fulfillment slot is unavailable. Refresh checkout and choose an active slot.");

    let deliveryZoneId: string | null = null;
    let pickupLocationId: string | null = null;
    let address1: string | null = null;
    let address2: string | null = null;
    let city: string | null = null;
    let state: string | null = null;
    let postcode: string | null = null;
    let deliveryFeePaise = 0;
    let scheduledFor: Date | null = null;
    
    
    if (typeof b.scheduledFor === "string" && b.scheduledFor) {
      const parsed = new Date(b.scheduledFor);
      if (!Number.isFinite(parsed.getTime())) {
        return jsonError("Choose a valid fulfillment date and time.");
      }
      const now = new Date();
      const requested = getIndiaDateTime(parsed);
      const today = getIndiaDateTime(now).date;
      const latestDate = addCalendarDays(today, MAX_ADVANCE_DAYS);
      
      if (parsed.getTime() <= now.getTime()) {
        return jsonError("Choose a future fulfillment date and time.");
      }
      
      if (requested.date > latestDate) {
        return jsonError("Orders can only be scheduled up to 90 days in advance.");
      
      }
      const maxPreparationHours = Math.max(
        ...variants.map((variant) => variant.product.preparationHours)
      );
      const earliestAllowedTime =
      now.getTime() + maxPreparationHours * 60 * 60 * 1000;
      if (parsed.getTime() < earliestAllowedTime) {
        return jsonError(
          `Your order needs at least ${maxPreparationHours} hours of preparation. Please choose a later time.`
        
        );
      }
      if (
        !/^\d{2}:\d{2}$/.test(slot.startTime) ||
        !/^\d{2}:\d{2}$/.test(slot.endTime) ||
        !/^\d{2}:\d{2}$/.test(slot.cutOffTime) ||
        slot.startTime >= slot.endTime ||
        slot.capacity < 1
      ) {
        return jsonError(
          "The selected fulfillment slot is not configured correctly. Please contact the bakery.",
          503
        );
      }
      
      if (!slot.weekdays.includes(getIndiaWeekday(requested.date))) {
        return jsonError(
          "That fulfillment slot is not available on the selected day."
        );
      }
      if (
        requested.time < slot.startTime ||
        requested.time >= slot.endTime
      ) {
        return jsonError(
          "Choose a date and time that falls within your selected slot."
        );
      
      }
      const currentIndiaTime = getIndiaDateTime(now);
      if (
        requested.date === currentIndiaTime.date &&
        currentIndiaTime.time >= slot.cutOffTime
      ) {
        return jsonError(
          "The same-day booking cutoff has passed. Please choose a later date."
        );
      }
      scheduledFor = parsed;
    } else {
      return jsonError("Choose a fulfillment date and time.");
    }

    if (type === FulfillmentType.DELIVERY) {
      address1 = typeof b.deliveryAddress1 === "string" ? b.deliveryAddress1.trim() : "";
      address2 = typeof b.deliveryAddress2 === "string" ? b.deliveryAddress2.trim() : null;
      city = typeof b.deliveryCity === "string" ? b.deliveryCity.trim() : "Coimbatore";
      state = typeof b.deliveryState === "string" ? b.deliveryState.trim() : "Tamil Nadu";
      postcode = typeof b.deliveryPostcode === "string" ? b.deliveryPostcode.trim() : "";
      if (!address1 || address1.length > 200) return jsonError("Enter your delivery address.");
      if (postcode !== POSTCODE) return jsonError(`Delivery is currently available only to PIN code ${POSTCODE}.`);
      const zone = await prisma.deliveryZone.findFirst({ where: { isActive: true, postcodes: { some: { postcode } } } });
      if (!zone) return jsonError("Delivery to this PIN code is not configured yet. Please contact the bakery.");
      deliveryZoneId = zone.id;
      const destination = `${address1}${address2 ? `, ${address2}` : ""}, ${city}, ${state} ${postcode}, India`;
      const meters = await getDrivingDistanceMeters(destination).catch((e: Error) => { throw e; });
      const startedKm = Math.ceil(meters / 1000);
      deliveryFeePaise = startedKm * 3000;
    } else {
      if (typeof b.pickupLocationId !== "string" || !b.pickupLocationId) return jsonError("Choose a pickup location.");
      const location = await prisma.pickupLocation.findFirst({ where: { id: b.pickupLocationId, isActive: true } });
      if (!location) return jsonError("That pickup location is unavailable.");
      pickupLocationId = location.id;
    }

    const subtotalPaise = variants.reduce((sum, v) => sum + v.pricePaise * (quantities.get(v.id) ?? 0), 0);
    if (!Number.isSafeInteger(subtotalPaise) || !Number.isSafeInteger(deliveryFeePaise)) return jsonError("Order total is invalid.", 400);
    const totalPaise = subtotalPaise + deliveryFeePaise;
    const orderNumber = `BBJ-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;

    const order = await prisma.$transaction(async (tx) => {
      if (!scheduledFor) {
        throw new Error("SCHEDULE_REQUIRED");
      }
      const scheduledDate = getIndiaDateTime(scheduledFor).date;
      const { start, end } = getIndiaDayBounds(scheduledDate);
      const bookedCount = await tx.order.count({
        where: {
          fulfillmentSlotId: slot.id,
          scheduledFor: {
            gte: start,
            lt: end,
          },
          status: {
            not: OrderStatus.CANCELLED,
          },
        },
      });
      if (bookedCount >= slot.capacity) {
        throw new Error("SLOT_FULL");
      }
      // Conditional atomic decrements prevent overselling under concurrent checkouts.
      for (const v of variants) {
        const quantity = quantities.get(v.id)!;
        const update = await tx.productVariant.updateMany({ where: { id: v.id, isActive: true, stockQuantity: { gte: quantity } }, data: { stockQuantity: { decrement: quantity } } });
        if (update.count !== 1) throw new Error(`STOCK_CHANGED:${v.product.name}`);
      }
      const created = await tx.order.create({
        data: {
          orderNumber, status: OrderStatus.PENDING, fulfillmentType: type,
          customerName: name, customerPhone: phone, customerEmail: email || null, customerNotes: notes,
          deliveryZoneId, pickupLocationId, fulfillmentSlotId: slot.id,
          deliveryAddress1: address1, deliveryAddress2: address2, deliveryCity: city, deliveryState: state, deliveryPostcode: postcode,
          scheduledFor, subtotalPaise, deliveryFeePaise, discountPaise: 0, totalPaise,
          items: { create: variants.map((v) => ({ productVariantId: v.id, productName: v.product.name, variantName: v.name, sku: v.sku, unit: v.unit, quantity: quantities.get(v.id)!, unitPricePaise: v.pricePaise, lineTotalPaise: v.pricePaise * quantities.get(v.id)! })) },
        },
      });
      await tx.inventoryMovement.createMany({ data: variants.map((v) => ({ productVariantId: v.id, orderId: created.id, quantityDelta: -quantities.get(v.id)!, reason: InventoryMovementReason.ORDER_RESERVED, note: `Reserved for order ${orderNumber}` })) });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ orderNumber: order.orderNumber, totalPaise, deliveryFeePaise }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_FULL") {
      return jsonError(
        "That time slot has filled up. Please choose another date or time.",
        409
      );
    }
    if (error instanceof Error && error.message === "SCHEDULE_REQUIRED") {
      return jsonError("Choose a fulfillment date and time.");
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return jsonError(
        "Another booking was processed at the same time. Please refresh checkout and try again.",
        409
      );
    }

    if (error instanceof Error && error.message.startsWith("STOCK_CHANGED:")) return jsonError(`${error.message.slice(14)} stock changed while checking out. Refresh your bag.`, 409);
    if (error instanceof Error && ["ROUTING_NOT_CONFIGURED", "ROUTING_FAILED", "ROUTE_NOT_FOUND"].includes(error.message)) return jsonError("Driving-distance pricing is not configured or a route could not be calculated. Please try again later or contact the bakery.", 503);
    console.error("Checkout failed:", error);
    return jsonError("We couldn't place your order. Please try again.", 500);
  }
}
