"use server";

import { db } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { validateAction, standardRateLimit } from "@/lib/arcjet";
import { apiResponse } from "@/lib/permissions";

/**
 * Create a new special delivery request.
 */
export async function createSpecialDeliveryRequest(productId, quantity, sellerId, unit = null) {
    await validateAction(standardRateLimit);
    try {
        const user = await currentUser();
        if (!user) throw new Error("Unauthorized");

        // Check for existing request
        const existing = await db.specialDeliveryRequest.findFirst({
            where: {
                userId: user.id,
                productId: productId
            }
        });

        const COOLDOWN_MINUTES = 15;

        if (existing) {
            // --- NEW: STRICT RE-REQUEST LOGIC ---
            // Case 1: Already Approved & Not Consumed
            if (existing.status === 'APPROVED' && !existing.isConsumed) {
                if (parseFloat(quantity) <= existing.quantity) {
                    return apiResponse.success(existing, "Current quantity is already covered by an approved mediation.");
                }
                // If quantity exceeds, fall through to update to PENDING below
            }

            // Case 2: Already Pending
            if (existing.status === 'PENDING') {
                if (parseFloat(quantity) === existing.quantity) {
                    return apiResponse.success(existing, "You already have a pending request for this exact quantity.");
                }
                // Fall through to update quantity below
            }

            if (existing.status === 'REJECTED' && existing.rejectedAt) {
                const now = new Date();
                const cooldownEnd = new Date(existing.rejectedAt.getTime() + COOLDOWN_MINUTES * 60 * 1000);

                if (now < cooldownEnd) {
                    const remaining = Math.ceil((cooldownEnd - now) / 1000 / 60);
                    return apiResponse.error(`This request was recently rejected. Please wait ${remaining} minutes before re-requesting.`);
                }
            }

            // Update existing record (Re-request)
            // If it was previously approved and held stock, release that stock before rewriting to PENDING
            if (existing.status === 'APPROVED' && !existing.isConsumed) {
                await db.productListing.update({
                    where: { id: existing.productId },
                    data: { reservedStock: { decrement: existing.quantity } }
                });
            }

            const updated = await db.specialDeliveryRequest.update({
                where: { id: existing.id },
                data: {
                    quantity: parseFloat(quantity),
                    unit: unit,
                    status: "PENDING",
                    inquirySent: false, // Reset inquiry status on re-request
                    isConsumed: false, // Re-requesting makes it active again
                    rejectedAt: null, // Reset rejection timestamp
                    approvedAt: null, // Reset approval timestamp
                    adminNotes: null, // Clear old notes
                    negotiatedFee: null // Clear old fee
                }
            });

            revalidatePath("/cart");
            return apiResponse.success(updated, "Request submitted for approval.");
        }

        // Create new if none exists
        const request = await db.specialDeliveryRequest.create({
            data: {
                userId: user.id,
                productId: productId,
                quantity: parseFloat(quantity),
                unit: unit,
                sellerId: sellerId,
                status: "PENDING",
                inquirySent: false,
                isConsumed: false
            }
        });

        revalidatePath("/cart");
        return apiResponse.success(request, "Special delivery request submitted for admin approval.");
    } catch (error) {
        return apiResponse.error(error.message);
    }
}

/**
 * Get all special delivery requests for Admin.
 */
export async function getSpecialDeliveryRequests() {
    try {
        const user = await currentUser();
        if (!user) throw new Error("Unauthorized");

        const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { role: true }
        });

        if (!dbUser || dbUser.role !== 'admin') {
            throw new Error("Unauthorized: Admin privileges required.");
        }

        const requests = await db.specialDeliveryRequest.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        farmerProfile: { select: { phone: true, address: true } },
                        agentProfile: { select: { phone: true, address: true } },
                        deliveryProfile: { select: { phone: true, address: true } }
                    }
                },
                product: {
                    include: {
                        farmer: {
                            select: {
                                name: true,
                                phone: true,
                                address: true,
                                city: true,
                                state: true
                            }
                        },
                        agent: {
                            select: {
                                name: true,
                                companyName: true,
                                phone: true,
                                address: true,
                                city: true,
                                state: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formattedRequests = requests.map(req => {
            const buyerProfile = req.user.farmerProfile || req.user.agentProfile || req.user.deliveryProfile;
            return {
                ...req,
                buyerPhone: buyerProfile?.phone || "NOT PROVIDED",
                buyerAddress: buyerProfile?.address || "NOT PROVIDED"
            };
        });

        return apiResponse.success(formattedRequests);
    } catch (error) {
        return apiResponse.error(error.message);
    }
}

/**
 * Approve or reject a special delivery request.
 */
export async function updateSpecialDeliveryStatus(requestId, status, negotiatedFee = null, notes = "", adminQuantity = null) {
    try {
        const user = await currentUser();
        if (!user) throw new Error("Unauthorized");

        const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { role: true }
        });

        if (!dbUser || dbUser.role !== 'admin') {
            throw new Error("Unauthorized: Admin privileges required.");
        }

        const updated = await db.$transaction(async (tx) => {
            const currentRequest = await tx.specialDeliveryRequest.findUnique({
                where: { id: requestId },
                include: { product: { select: { unit: true } } }
            });

            if (!currentRequest) throw new Error("Request not found");

            const request = await tx.specialDeliveryRequest.update({
                where: { id: requestId },
                data: {
                    status: status,
                    negotiatedFee: negotiatedFee ? parseFloat(negotiatedFee) : null,
                    quantity: adminQuantity ? parseFloat(adminQuantity) : undefined, // Admin can override quantity
                    unit: currentRequest.product?.unit || undefined, // Save the unit of that particular product
                    adminNotes: notes,
                    rejectedAt: status === 'REJECTED' ? new Date() : null,
                    approvedAt: status === 'APPROVED' ? new Date() : null
                }
            });

            // --- NEW: RESERVED STOCK CACHING ---
            const newQuantity = adminQuantity ? parseFloat(adminQuantity) : currentRequest.quantity;
            
            // If it WAS NOT approved, but IS NOW approved
            if (currentRequest.status !== 'APPROVED' && status === 'APPROVED') {
                await tx.productListing.update({
                    where: { id: currentRequest.productId },
                    data: { reservedStock: { increment: newQuantity } }
                });
            } 
            // If it WAS approved, but IS NOW rejected/pending/etc
            else if (currentRequest.status === 'APPROVED' && status !== 'APPROVED' && !currentRequest.isConsumed) {
                await tx.productListing.update({
                    where: { id: currentRequest.productId },
                    data: { reservedStock: { decrement: currentRequest.quantity } }
                });
            }
            // If it WAS approved, and IS STILL approved, but admin changed quantity
            else if (currentRequest.status === 'APPROVED' && status === 'APPROVED' && adminQuantity !== null && newQuantity !== currentRequest.quantity && !currentRequest.isConsumed) {
                 const diff = newQuantity - currentRequest.quantity;
                 await tx.productListing.update({
                    where: { id: currentRequest.productId },
                    data: { reservedStock: { increment: diff } }
                });
            }

            // --- NEW: Immediate UI Feedback ---
            // If the admin rejects the request, instantly remove the item from the buyer's cart
            if (status === 'REJECTED') {
                await tx.cartItem.deleteMany({
                    where: {
                        cart: { userId: request.userId },
                        productId: request.productId
                    }
                });
            } else if (status === 'APPROVED' && request.quantity) {
                // If the admin approves a quantity lower than what's in the cart, instantly clamp it
                const existingCartItems = await tx.cartItem.findMany({
                    where: {
                        cart: { userId: request.userId },
                        productId: request.productId
                    }
                });
                for (const ci of existingCartItems) {
                    if (ci.quantity > request.quantity) {
                        await tx.cartItem.update({
                            where: { id: ci.id },
                            data: { quantity: request.quantity }
                        });
                    }
                }
            }
            return request;
        });

        revalidatePath("/admin-dashboard");
        revalidatePath("/cart");
        return apiResponse.success(updated, `Request ${status.toLowerCase()} successfully.`);
    } catch (error) {
        return apiResponse.error(error.message);
    }
}

/**
 * Get active approved requests for a user's cart.
 */
export async function getUserSpecialDeliveryRequests() {
    try {
        const user = await currentUser();
        if (!user) return apiResponse.error("Unauthorized");

        // Note: Expiry logic for EXPIRED (10-days) and REJECTED (1-hour) 
        // is now handled asynchronously by a Vercel Cron Job to improve cart load performance.

        const requests = await db.specialDeliveryRequest.findMany({
            where: {
                userId: user.id,
                status: { in: ["PENDING", "APPROVED", "REJECTED"] },
                isConsumed: false
            }
        });

        return apiResponse.success(requests);
    } catch (error) {
        return apiResponse.error(error.message);
    }
}

/**
 * Mark an inquiry as sent for a specific product.
 */
export async function markInquiryAsSent(productId) {
    try {
        const user = await currentUser();
        if (!user) throw new Error("Unauthorized");

        const updated = await db.specialDeliveryRequest.updateMany({
            where: {
                userId: user.id,
                productId: productId,
                status: "PENDING"
            },
            data: {
                inquirySent: true
            }
        });

        revalidatePath("/marketplace");
        revalidatePath("/cart");
        return apiResponse.success(updated, "Inquiry marked as sent.");
    } catch (error) {
        return apiResponse.error(error.message);
    }
}

/**
 * Delete a special delivery request (Cancel mediation)
 */
export async function deleteSpecialDeliveryRequest(requestId) {
    try {
        const user = await currentUser();
        if (!user) throw new Error("Unauthorized");

        const existing = await db.specialDeliveryRequest.findUnique({
            where: { id: requestId, userId: user.id }
        });

        if (!existing) throw new Error("Request not found");

        await db.$transaction(async (tx) => {
             if (existing.status === 'APPROVED' && !existing.isConsumed) {
                 await tx.productListing.update({
                     where: { id: existing.productId },
                     data: { reservedStock: { decrement: existing.quantity } }
                 });
             }
             await tx.specialDeliveryRequest.delete({
                 where: { id: requestId }
             });
        });

        revalidatePath("/cart");
        return apiResponse.success(null, "Mediation request cancelled.");
    } catch (error) {
        return apiResponse.error(error.message);
    }
}

/**
 * Background Cron Job Task: Sweep expired and rejected special deliveries.
 * Decoupled from user requests to improve performance.
 */
export async function sweepExpiredSpecialDeliveries() {
    try {
        // 1. Sweep 10-Day EXPIRED Approvals
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        const expiredApprovals = await db.specialDeliveryRequest.findMany({
            where: {
                status: 'APPROVED',
                isConsumed: false,
                OR: [
                    { approvedAt: { lt: tenDaysAgo } },
                    { approvedAt: null, updatedAt: { lt: tenDaysAgo } } // Legacy fallback
                ]
            }
        });

        if (expiredApprovals.length > 0) {
            await db.$transaction(async (tx) => {
                await tx.specialDeliveryRequest.updateMany({
                    where: { id: { in: expiredApprovals.map(r => r.id) } },
                    data: { status: 'EXPIRED' }
                });
                
                // Release reserved stock for each expired approval
                for (const req of expiredApprovals) {
                    await tx.productListing.update({
                        where: { id: req.productId },
                        data: { reservedStock: { decrement: req.quantity } }
                    });
                }
            });
        }

        // 2. Sweep 1-Hour Stale REJECTED Requests & remove from carts
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const staleRequests = await db.specialDeliveryRequest.findMany({
            where: {
                status: 'REJECTED',
                rejectedAt: { lt: oneHourAgo }
            }
        });

        if (staleRequests.length > 0) {
            await db.$transaction(async (tx) => {
                // Delete cart items for each stale request, preserving user-product pairing
                await tx.cartItem.deleteMany({
                    where: {
                        OR: staleRequests.map(req => ({
                            productId: req.productId,
                            cart: { userId: req.userId }
                        }))
                    }
                });
                // Delete the stale requests
                await tx.specialDeliveryRequest.deleteMany({
                    where: { id: { in: staleRequests.map(r => r.id) } }
                });
            });
        }

        return apiResponse.success(null, "Sweep completed.");
    } catch (error) {
        return apiResponse.error(error.message);
    }
}
