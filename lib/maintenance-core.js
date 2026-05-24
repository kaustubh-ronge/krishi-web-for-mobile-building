import { db } from "@/lib/prisma";

/**
 * Core internal function to reclaim abandoned stock.
 * This is decoupled from server actions so it can be called safely by cron routes.
 */
export async function _reclaimAbandonedStockInternal() {
    try {
        const now = new Date();

        // 1. Find all PENDING orders that have expired
        const expiredOrders = await db.order.findMany({
            where: {
                paymentStatus: "PENDING",
                expiresAt: { lt: now }
            },
            include: {
                items: true
            }
        });

        if (expiredOrders.length === 0) {
            return { success: true, reclaimedCount: 0 };
        }

        let totalReclaimed = 0;

        for (const order of expiredOrders) {
            await db.$transaction(async (tx) => {
                // ATOMIC GUARD: Only one process should succeed in flipping the status
                const updateRes = await tx.order.updateMany({
                    where: {
                        id: order.id,
                        paymentStatus: "PENDING"
                    },
                    data: {
                        paymentStatus: "CANCELLED",
                        orderStatus: "CANCELLED",
                        expiresAt: null
                    }
                });

                if (updateRes.count === 0) {
                    return;
                }

                // Restore stock ONLY if we won the race
                for (const item of order.items) {
                    await tx.productListing.update({
                        where: { id: item.productId },
                        data: {
                            availableStock: { increment: item.quantity },
                            isAvailable: true
                        }
                    });
                }

                // Removed aggressive cart cleanup block to avoid deleting user's newly re-added items
                
                totalReclaimed++;
            });
        }

        return { success: true, reclaimedCount: totalReclaimed };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
