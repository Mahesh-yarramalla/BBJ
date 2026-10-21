import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class OrderActionError extends Error {
  constructor(
    public readonly code:
      | "ORDER_NOT_FOUND"
      | "INVALID_TRANSITION"
      | "CANCELLATION_MOVEMENT_EXISTS"
      | "ORDER_CHANGED",
  ) {
    super(code);
    this.name = "OrderActionError";
  }
}

export async function updateAdminOrderStatus(
  id: string,
  next: OrderStatus,
) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            fulfillmentType: true,
            items: {
              select: {
                productVariantId: true,
                quantity: true,
              },
            },
          },
        });

        if (!order) {
          throw new OrderActionError("ORDER_NOT_FOUND");
        }

        if (next === OrderStatus.CANCELLED) {
          if (
            order.status !== OrderStatus.PENDING &&
            order.status !== OrderStatus.CONFIRMED
          ) {
            throw new OrderActionError("INVALID_TRANSITION");
          }

          const existingCancellation =
            await tx.inventoryMovement.findFirst({
              where: {
                orderId: order.id,
                reason: "ORDER_CANCELLED",
              },
              select: { id: true },
            });

          if (existingCancellation) {
            throw new OrderActionError("CANCELLATION_MOVEMENT_EXISTS");
          }

          const result = await tx.order.updateMany({
            where: { id: order.id, status: order.status },
            data: { status: OrderStatus.CANCELLED },
          });

          if (result.count !== 1) {
            throw new OrderActionError("ORDER_CHANGED");
          }

          const quantitiesByVariant = new Map<string, number>();

          for (const item of order.items) {
            if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
              throw new Error("INVALID_ORDER_ITEM_QUANTITY");
            }

            quantitiesByVariant.set(
              item.productVariantId,
              (quantitiesByVariant.get(item.productVariantId) ?? 0) +
                item.quantity,
            );
          }

          for (const [productVariantId, quantity] of quantitiesByVariant) {
            await tx.productVariant.update({
              where: { id: productVariantId },
              data: { stockQuantity: { increment: quantity } },
            });

            await tx.inventoryMovement.create({
              data: {
                productVariantId,
                orderId: order.id,
                quantityDelta: quantity,
                reason: "ORDER_CANCELLED",
                note: `Restored for cancelled order ${order.orderNumber}`,
              },
            });
          }
        } else {
          const allowed = (() => {
            switch (order.status) {
              case OrderStatus.PENDING:
                return next === OrderStatus.CONFIRMED;

              case OrderStatus.CONFIRMED:
                return next === OrderStatus.PREPARING;

              case OrderStatus.PREPARING:
                return order.fulfillmentType === "PICKUP"
                  ? next === OrderStatus.READY_FOR_PICKUP
                  : next === OrderStatus.OUT_FOR_DELIVERY;

              case OrderStatus.READY_FOR_PICKUP:
              case OrderStatus.OUT_FOR_DELIVERY:
                return next === OrderStatus.COMPLETED;

              default:
                return false;
            }
          })();

          if (!allowed) {
            throw new OrderActionError("INVALID_TRANSITION");
          }

          const result = await tx.order.updateMany({
            where: { id: order.id, status: order.status },
            data: { status: next },
          });

          if (result.count !== 1) {
            throw new OrderActionError("ORDER_CHANGED");
          }
        }

        return tx.order.findUniqueOrThrow({
          where: { id: order.id },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            updatedAt: true,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new OrderActionError("ORDER_CHANGED");
    }

    throw error;
  }
}
