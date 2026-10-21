
import { PrismaClient, OrderStatus, FulfillmentType, InventoryMovementReason } from "@prisma/client";
import { updateAdminOrderStatus } from "../src/lib/order-status-core.ts";
const prisma = new PrismaClient();

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (!/\/bake_and_bloom_test(?:\?|$)/.test(databaseUrl)) {
    throw new Error(
      "SAFETY STOP: DATABASE_URL must target bake_and_bloom_test."
    );
  }

  let categoryId;
  let productId;
  let variantId;
  let orderId;
  let cleanupNeeded = false;

  try {
    const category = await prisma.category.create({
      data: {
        name: `Cancellation Test ${Date.now()}`,
        slug: `cancellation-test-${Date.now()}`,
      },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        slug: `cancellation-product-${Date.now()}`,
        name: "Cancellation Test Product",
        description: "Temporary isolated cancellation test.",
        categoryId,
        imageUrl: "/test-image.png",
        imageAlt: "Test product",
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name: "Test Unit",
        sku: `CANCEL-TEST-${Date.now()}`,
        unit: "piece",
        pricePaise: 10000,
        stockQuantity: 5,
      },
    });
    variantId = variant.id;

    const order = await prisma.$transaction(async (tx) => {
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: { decrement: 2 } },
      });

      const createdOrder = await tx.order.create({
        data: {
          orderNumber: `TEST-CANCEL-${Date.now()}`,
          status: OrderStatus.PENDING,
          fulfillmentType: FulfillmentType.PICKUP,
          customerName: "Cancellation Test",
          customerPhone: "0000000000",
          subtotalPaise: 20000,
          deliveryFeePaise: 0,
          discountPaise: 0,
          totalPaise: 20000,
          items: {
            create: {
              productVariantId: variantId,
              productName: "Cancellation Test Product",
              variantName: "Test Unit",
              sku: variant.sku,
              unit: "piece",
              quantity: 2,
              unitPricePaise: 10000,
              lineTotalPaise: 20000,
            },
          },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          productVariantId: variantId,
          orderId: createdOrder.id,
          quantityDelta: -2,
          reason: InventoryMovementReason.ORDER_RESERVED,
          note: `Reserved for test order ${createdOrder.orderNumber}`,
        },
      });

      return createdOrder;
    });

    orderId = order.id;
    cleanupNeeded = true;

    const reservedStock = (
      await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
        select: { stockQuantity: true },
      })
    ).stockQuantity;

    if (reservedStock !== 3) {
      throw new Error(`Expected reserved stock 3; got ${reservedStock}.`);
    }

    // Call the exact function used by the admin API.
    const cancelled = await updateAdminOrderStatus(
      orderId,
      OrderStatus.CANCELLED,
    );

    if (cancelled.status !== OrderStatus.CANCELLED) {
      throw new Error("The shared function did not cancel the order.");
    }

    const restoredStock = (
      await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
        select: { stockQuantity: true },
      })
    ).stockQuantity;

    if (restoredStock !== 5) {
      throw new Error(`Expected restored stock 5; got ${restoredStock}.`);
    }

    // Retry cancellation: it must reject and must not restore stock again.
    let retryRejected = false;

    try {
      await updateAdminOrderStatus(orderId, OrderStatus.CANCELLED);
    } catch (error) {
      retryRejected =
        error?.code === "INVALID_TRANSITION" ||
        error?.message === "INVALID_TRANSITION";
    }

    if (!retryRejected) {
      throw new Error("A repeated cancellation was not rejected.");
    }

    const stockAfterRetry = (
      await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
        select: { stockQuantity: true },
      })
    ).stockQuantity;

    const movements = await prisma.inventoryMovement.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
      select: { reason: true, quantityDelta: true },
    });

    const cancellationMovements = movements.filter(
      (movement) =>
        movement.reason === InventoryMovementReason.ORDER_CANCELLED,
    );

    if (
      stockAfterRetry !== 5 ||
      cancellationMovements.length !== 1 ||
      cancellationMovements[0].quantityDelta !== 2
    ) {
      throw new Error("Repeated cancellation safety verification failed.");
    }

    console.log("PASS: Shared cancellation function verified.");
    console.log({
      orderNumber: cancelled.orderNumber,
      status: cancelled.status,
      stockAfterReservation: reservedStock,
      stockAfterCancellation: restoredStock,
      stockAfterRepeatedRequest: stockAfterRetry,
      movements,
      repeatedCancellationRejected: retryRejected,
    });
  } finally {
    try {
      if (orderId && cleanupNeeded) {
        await prisma.$transaction(async (tx) => {
          await tx.inventoryMovement.deleteMany({ where: { orderId } });
          await tx.orderItem.deleteMany({ where: { orderId } });
          await tx.order.delete({ where: { id: orderId } });
        });
      }

      if (variantId) {
        await prisma.inventoryMovement.deleteMany({
          where: { productVariantId: variantId },
        });
        await prisma.productVariant.delete({ where: { id: variantId } });
      }

      if (productId) {
        await prisma.productImage.deleteMany({ where: { productId } });
        await prisma.product.delete({ where: { id: productId } });
      }

      if (categoryId) {
        await prisma.category.delete({ where: { id: categoryId } });
      }
    } finally {
      await prisma.$disconnect();
    }
  }
}

main().catch((error) => {
  console.error("Cancellation test failed:", error);
  process.exitCode = 1;
});
