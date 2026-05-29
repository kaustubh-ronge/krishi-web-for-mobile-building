// "use server";

// import { currentUser } from "@clerk/nextjs/server";
// import { revalidatePath } from "next/cache";
// import { validateAction, standardRateLimit } from "@/lib/arcjet";
// import { db } from "@/lib/prisma";
// import { cache } from "react";

// // --- DYNAMIC STOCK RESERVATION HELPER ---
// async function getSellableStock(productId, currentStock) {
//   const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
//   const activeApprovals = await db.specialDeliveryRequest.aggregate({
//     where: {
//       productId: productId,
//       status: 'APPROVED',
//       isConsumed: false,
//       OR: [
//         { approvedAt: { gte: tenDaysAgo } },
//         { approvedAt: null, updatedAt: { gte: tenDaysAgo } }
//       ]
//     },
//     _sum: { quantity: true }
//   });
//   const reservedStock = activeApprovals._sum.quantity || 0;
//   return Math.max(0, currentStock - reservedStock);
// }

// // 1. GET CART
// export const getCart = cache(async () => {
//   const user = await currentUser();
//   if (!user) return { success: false, data: null };

//   try {
//     const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
//     if (dbUser?.role === 'admin' || dbUser?.role === 'super_admin') {
//       return { success: false, data: { items: [] }, error: "Admins cannot have a cart." };
//     }

//     const cart = await db.cart.findUnique({
//       where: { userId: user.id },
//       include: {
//         items: {
//           include: {
//             product: {
//               select: {
//                 id: true,
//                 productName: true,
//                 pricePerUnit: true,
//                 deliveryCharge: true,
//                 deliveryChargeType: true,
//                 unit: true,
//                 images: true,
//                 availableStock: true,
//                 minOrderQuantity: true,
//                 sellerType: true,
//                 farmerId: true,
//                 agentId: true,
//               }
//             }
//           },
//           orderBy: { createdAt: 'desc' }
//         }
//       }
//     });

//     if (!cart) return { success: true, data: { items: [] } };
//     return { success: true, data: cart };
//   } catch (error) {
//     console.error("Get Cart Error:", error);
//     return { success: false, error: "Failed to fetch cart" };
//   }
// });

// /**
//  * 2. ADD TO CART
//  */

// export async function addToCart(productId, quantity) {
//   await validateAction(standardRateLimit);
//   const user = await currentUser();
//   if (!user) return { success: false, error: "Please log in." };
//   try {
//     const product = await db.productListing.findUnique({
//       where: { id: productId },
//       select: { availableStock: true, unit: true, farmerId: true, agentId: true, minOrderQuantity: true, productName: true }
//     });

//     if (!product) return { success: false, error: "Product not found." };

//     // ─── ADMIN CHECK ───
//     const dbUser = await db.user.findUnique({
//       where: { id: user.id },
//       include: { farmerProfile: true, agentProfile: true }
//     });

//     if (dbUser?.role === 'admin' || dbUser?.role === 'super_admin') {
//       return { success: false, error: "Admins are not permitted to purchase products." };
//     }

//     if (dbUser) {
//       if (product.farmerId && dbUser.farmerProfile?.id === product.farmerId) {
//         return { success: false, error: "You cannot purchase your own product." };
//       }
//       if (product.agentId && dbUser.agentProfile?.id === product.agentId) {
//         return { success: false, error: "You cannot purchase your own product." };
//       }
//     }

//     // 0. Input Validation
//     if (isNaN(quantity) || quantity <= 0) {
//       return { success: false, error: "Invalid quantity. Please enter a positive number." };
//     }

//     // Min Quantity Check
//     if (quantity < (product.minOrderQuantity || 1)) {
//       return { success: false, error: `${product.productName} requires a minimum order of ${product.minOrderQuantity || 1} ${product.unit}.` };
//     }

//     // 1. Atomic Cart Retrieval/Creation
//     const cart = await db.cart.upsert({
//       where: { userId: user.id },
//       update: {},
//       create: { userId: user.id }
//     });

//     // 2. Check if item already exists to calculate cumulative quantity
//     const existingItem = await db.cartItem.findUnique({
//       where: {
//         cartId_productId: {
//           cartId: cart.id,
//           productId: productId
//         }
//       }
//     });

//     const currentQtyInCart = existingItem ? existingItem.quantity : 0;
//     const totalPotentialQty = currentQtyInCart + quantity;

//     // 2.5 Dynamic Stock & Out of Range Enforcement
//     const approvedReq = await db.specialDeliveryRequest.findFirst({
//       where: {
//         userId: user.id,
//         productId: productId,
//         status: 'APPROVED',
//         isConsumed: false
//       }
//     });

//     // If item was previously soft-removed from cart but approval is still active, reset the flag
//     if (approvedReq && approvedReq.isRemovedFromCart) {
//       await db.specialDeliveryRequest.update({
//         where: { id: approvedReq.id },
//         data: { isRemovedFromCart: false }
//       });
//     }

//     const sellableStock = await getSellableStock(productId, product.availableStock);
//     const effectiveStockLimit = approvedReq ? approvedReq.quantity : sellableStock;

//     if (totalPotentialQty > effectiveStockLimit) {
//       if (approvedReq) {
//         return {
//           success: false,
//           error: `Special Delivery restriction: You are approved for a maximum of ${approvedReq.quantity} units, but your cart would contain ${totalPotentialQty}.`
//         };
//       } else {
//         return {
//           success: false,
//           error: `Cannot add more. You already have ${currentQtyInCart} in cart. Max available is ${sellableStock}.`
//         };
//       }
//     }

//     // 3. Atomic Item Mutation with Race-Condition Guard
//     if (approvedReq) {
//       try {
//         await db.$transaction(async (tx) => {
//           // EXPLICIT ROW LOCK: Lock the user's cart to serialize all concurrent addToCart requests
//           await tx.$queryRaw`SELECT id FROM "carts" WHERE id = ${cart.id} FOR UPDATE`;

//           const checkItem = await tx.cartItem.findUnique({
//             where: { cartId_productId: { cartId: cart.id, productId: productId } }
//           });
//           const currentCheckQty = checkItem ? checkItem.quantity : 0;

//           if (currentCheckQty + quantity > approvedReq.quantity) {
//             throw new Error(`Special Delivery restriction: You are approved for a maximum of ${approvedReq.quantity} units, but your cart would contain ${currentCheckQty + quantity}.`);
//           }

//           await tx.cartItem.upsert({
//             where: { cartId_productId: { cartId: cart.id, productId: productId } },
//             update: { quantity: { increment: quantity } },
//             create: { cartId: cart.id, productId: productId, quantity: quantity }
//           });
//         }, { isolationLevel: 'Serializable' });
//       } catch (error) {
//         return { success: false, error: error.message };
//       }
//     } else {
//       await db.cartItem.upsert({
//         where: {
//           cartId_productId: {
//             cartId: cart.id,
//             productId: productId
//           }
//         },
//         update: {
//           quantity: { increment: quantity }
//         },
//         create: {
//           cartId: cart.id,
//           productId: productId,
//           quantity: quantity
//         }
//       });
//     }

//     revalidatePath('/cart');
//     return { success: true };
//   } catch (error) {
//     console.error("Add Cart Error:", error);
//     return { success: false, error: "Failed to add to cart" };
//   }
// }

// /**
//  * 3. REMOVE FROM CART
//  * - Normal in-range products: hard-delete (standard e-commerce behavior).
//  * - Approved out-of-range products: soft-hide by setting isRemovedFromCart=true on the
//  *   SpecialDeliveryRequest. This preserves the 10-day approval timer and reserved stock
//  *   allocation so the user can re-add without re-requesting.
//  */
// export async function removeFromCart(cartItemId) {
//   await validateAction(standardRateLimit);
//   const user = await currentUser();
//   if (!user) return { success: false, error: "Not logged in" };

//   try {
//     const item = await db.cartItem.findUnique({
//       where: { id: cartItemId },
//       include: { cart: { select: { userId: true } }, product: { select: { id: true } } }
//     });

//     const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
//     if (dbUser?.role === 'admin' || dbUser?.role === 'super_admin') {
//       return { success: false, error: "Unauthorized: Admins cannot have a cart." };
//     }

//     if (!item || item.cart.userId !== user.id) {
//       return { success: false, error: "Item not found or unauthorized" };
//     }

//     // Check if this product has an active, non-consumed Special Delivery approval
//     const activeApproval = await db.specialDeliveryRequest.findFirst({
//       where: {
//         userId: user.id,
//         productId: item.product.id,
//         status: 'APPROVED',
//         isConsumed: false,
//       }
//     });

//     if (activeApproval) {
//       // CASE 2 — OUT-OF-RANGE APPROVED PRODUCT:
//       // Soft-hide: mark the approval as removed from cart UI but preserve the reservation.
//       // The CartItem is still fully deleted — it just won't reappear unless re-added.
//       await db.specialDeliveryRequest.update({
//         where: { id: activeApproval.id },
//         data: { isRemovedFromCart: true }
//       });
//     }

//     // Always hard-delete the CartItem itself (for both cases)
//     await db.cartItem.delete({ where: { id: cartItemId } });

//     revalidatePath('/cart');
//     return { success: true, wasApproved: !!activeApproval };
//   } catch (error) {
//     console.log("Remove Cart Error:", error?.message || error);
//     return { success: false, error: "Failed to remove item." };
//   }
// }

// /**
//  * 4. UPDATE CART ITEM QUANTITY
//  */
// export async function updateCartItemQuantity(cartItemId, newQuantity) {
//   await validateAction(standardRateLimit);
//   const user = await currentUser();
//   if (!user) return { success: false, error: "Not logged in" };

//   try {
//     if (isNaN(newQuantity) || newQuantity <= 0) {
//       return { success: false, error: "Quantity must be a positive number." };
//     }
//     const item = await db.cartItem.findUnique({
//       where: { id: cartItemId },
//       include: {
//         cart: { select: { userId: true } },
//         product: true
//       }
//     });

//     const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
//     if (dbUser?.role === 'admin' || dbUser?.role === 'super_admin') {
//       return { success: false, error: "Unauthorized: Admins cannot have a cart." };
//     }

//     if (!item || item.cart.userId !== user.id) {
//       return { success: false, error: "Item not found or unauthorized" };
//     }

//     // Check availability before updating
//     const approvedReq = await db.specialDeliveryRequest.findFirst({
//       where: { userId: user.id, productId: item.productId, status: 'APPROVED', isConsumed: false }
//     });
//     const sellableStock = await getSellableStock(item.productId, item.product.availableStock);
//     const effectiveStockLimit = approvedReq ? approvedReq.quantity : sellableStock;

//     if (effectiveStockLimit < newQuantity) {
//       return { success: false, error: `Only ${effectiveStockLimit} available.` };
//     }

//     // Min Quantity Check
//     const minQty = approvedReq ? 1 : (item.product.minOrderQuantity || 1);
//     if (newQuantity < minQty) {
//       return { success: false, error: `Minimum order is ${minQty} ${item.product.unit}.` };
//     }

//     await db.cartItem.update({
//       where: { id: cartItemId },
//       data: { quantity: newQuantity }
//     });

//     revalidatePath('/cart');
//     return { success: true };
//   } catch (error) {
//     console.error(`Update Qty Error:`, error);
//     return { success: false, error: "Failed to update quantity" };
//   }
// }

// /**
//  * 5. CLEAR CART
//  * Removes all items from the current user's cart without restoring stock (used after successful purchase)
//  */
// export async function clearCart() {
//   const user = await currentUser();
//   if (!user) return { success: false, error: "Not logged in" };

//   try {
//     const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
//     if (dbUser?.role === 'admin' || dbUser?.role === 'super_admin') {
//       return { success: false, error: "Unauthorized" };
//     }

//     const cart = await db.cart.findUnique({ where: { userId: user.id } });
//     if (!cart) return { success: true };

//     await db.cartItem.deleteMany({ where: { cartId: cart.id } });
//     return { success: true };
//   } catch (err) {
//     console.error("Clear Cart Error:", err);
//     return { success: false, error: "Failed to clear cart" };
//   }
// }

// /**
//  * 6. RECONCILE CART ITEMS
//  * Dynamically scans the user's cart against real-time database stock.
//  * Deletes items with 0 stock, downscales items with insufficient stock.
//  */
// export async function reconcileCartItems() {
//   const user = await currentUser();
//   if (!user) return { success: false, messages: [] };

//   try {
//     const cart = await db.cart.findUnique({
//       where: { userId: user.id },
//       include: {
//         items: {
//           include: { product: true }
//         }
//       }
//     });

//     if (!cart || cart.items.length === 0) return { success: true, messages: [] };

//     const messages = [];

//     for (const item of cart.items) {
//       const stock = item.product.availableStock;
//       const sellableStock = await getSellableStock(item.productId, stock);

//       const approvedReq = await db.specialDeliveryRequest.findFirst({
//         where: { userId: user.id, productId: item.productId, status: 'APPROVED', isConsumed: false }
//       });

//       const effectiveStockLimit = approvedReq ? approvedReq.quantity : sellableStock;

//       // If product has been completely sold out
//       if (effectiveStockLimit <= 0) {
//         await db.cartItem.delete({ where: { id: item.id } });
//         messages.push(`"${item.product.productName}" was removed from your cart because it is now out of stock.`);
//       }
//       // If available stock dropped below requested quantity
//       else if (effectiveStockLimit < item.quantity) {
//         // Use effective min quantity to prevent hard-deleting approved items
//         const effectiveMinQty = approvedReq ? 1 : (item.product.minOrderQuantity || 1);
//         if (effectiveStockLimit < effectiveMinQty) {
//           await db.cartItem.delete({ where: { id: item.id } });
//           messages.push(`"${item.product.productName}" was removed from your cart because the remaining stock is below the minimum order quantity.`);
//         } else {
//           await db.cartItem.update({
//             where: { id: item.id },
//             data: { quantity: effectiveStockLimit }
//           });
//           messages.push(`Quantity for "${item.product.productName}" was reduced to ${effectiveStockLimit} ${item.product.unit} to match your approved mediation limit or stock availability.`);
//         }
//       }
//     }

//     if (messages.length > 0) {
//       revalidatePath('/cart');
//     }

//     return { success: true, messages };
//   } catch (err) {
//     console.error("Reconcile Cart Error:", err);
//     return { success: false, messages: [] };
//   }
// }

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ===================================================================
// BEFORE AND AFTER UPDATING CODE
// ===================================================================
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { validateAction, standardRateLimit } from "@/lib/arcjet";
import { db } from "@/lib/prisma";
import { cache } from "react";

// --- DYNAMIC STOCK RESERVATION HELPER ---
async function getSellableStock(productId, currentStock) {
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const activeApprovals = await db.specialDeliveryRequest.aggregate({
    where: {
      productId: productId,
      status: 'APPROVED',
      isConsumed: false,
      OR: [
        { approvedAt: { gte: tenDaysAgo } },
        { approvedAt: null, updatedAt: { gte: tenDaysAgo } }
      ]
    },
    _sum: { quantity: true }
  });
  const reservedStock = activeApprovals._sum.quantity || 0;
  return Math.max(0, currentStock - reservedStock);
}

// 1. GET CART
export const getCart = cache(async () => {
  const user = await currentUser();
  if (!user) return { success: false, data: null };

  try {
    const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
    if (dbUser?.role === 'admin' || dbUser?.role === 'super_admin') {
      return { success: false, data: { items: [] }, error: "Admins cannot have a cart." };
    }

    const cart = await db.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                productName: true,
                pricePerUnit: true,
                deliveryCharge: true,
                deliveryChargeType: true,
                unit: true,
                images: true,
                availableStock: true,
                minOrderQuantity: true,
                sellerType: true,
                farmerId: true,
                agentId: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!cart) return { success: true, data: { items: [] } };
    return { success: true, data: cart };
  } catch (error) {
    return { success: false, error: "Failed to fetch cart" };
  }
});

/**
 * 2. ADD TO CART
 */

export async function addToCart(productId, quantity) {
  await validateAction(standardRateLimit);
  const user = await currentUser();
  if (!user) return { success: false, error: "Please log in." };
  try {
    const product = await db.productListing.findUnique({
      where: { id: productId },
      select: { availableStock: true, unit: true, farmerId: true, agentId: true, minOrderQuantity: true, productName: true }
    });

    if (!product) return { success: false, error: "Product not found." };

    // ─── ADMIN CHECK ───
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      include: { farmerProfile: true, agentProfile: true }
    });

    if (dbUser?.role === 'admin' || dbUser?.role === 'super_admin') {
      return { success: false, error: "Admins are not permitted to purchase products." };
    }

    if (dbUser) {
      if (product.farmerId && dbUser.farmerProfile?.id === product.farmerId) {
        return { success: false, error: "You cannot purchase your own product." };
      }
      if (product.agentId && dbUser.agentProfile?.id === product.agentId) {
        return { success: false, error: "You cannot purchase your own product." };
      }
    }

    // 0. Input Validation
    if (isNaN(quantity) || quantity <= 0) {
      return { success: false, error: "Invalid quantity. Please enter a positive number." };
    }

    // Min Quantity Check
    if (quantity < (product.minOrderQuantity || 1)) {
      return { success: false, error: `${product.productName} requires a minimum order of ${product.minOrderQuantity || 1} ${product.unit}.` };
    }

    // 1. Atomic Cart Retrieval/Creation
    const cart = await db.cart.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id }
    });

    // 2. Check if item already exists to calculate cumulative quantity
    const existingItem = await db.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId
        }
      }
    });

    const currentQtyInCart = existingItem ? existingItem.quantity : 0;
    const totalPotentialQty = currentQtyInCart + quantity;

    // 2.5 Dynamic Stock & Out of Range Enforcement
    const approvedReq = await db.specialDeliveryRequest.findFirst({
      where: {
        userId: user.id,
        productId: productId,
        status: 'APPROVED',
        isConsumed: false
      }
    });

    // If item was previously soft-removed from cart but approval is still active, reset the flag
    if (approvedReq && approvedReq.isRemovedFromCart) {
      await db.specialDeliveryRequest.update({
        where: { id: approvedReq.id },
        data: { isRemovedFromCart: false }
      });
    }

    const sellableStock = await getSellableStock(productId, product.availableStock);
    const effectiveStockLimit = approvedReq ? approvedReq.quantity : sellableStock;

    if (totalPotentialQty > effectiveStockLimit) {
      if (approvedReq) {
        return {
          success: false,
          error: `Special Delivery restriction: You are approved for a maximum of ${approvedReq.quantity} units, but your cart would contain ${totalPotentialQty}.`
        };
      } else {
        return {
          success: false,
          error: `Cannot add more. You already have ${currentQtyInCart} in cart. Max available is ${sellableStock}.`
        };
      }
    }

    // 3. Atomic Item Mutation with Race-Condition Guard
    if (approvedReq) {
      try {
        await db.$transaction(async (tx) => {
          // EXPLICIT ROW LOCK: Lock the user's cart to serialize all concurrent addToCart requests
          await tx.$queryRaw`SELECT id FROM "carts" WHERE id = ${cart.id} FOR UPDATE`;

          const checkItem = await tx.cartItem.findUnique({
            where: { cartId_productId: { cartId: cart.id, productId: productId } }
          });
          const currentCheckQty = checkItem ? checkItem.quantity : 0;

          if (currentCheckQty + quantity > approvedReq.quantity) {
            throw new Error(`Special Delivery restriction: You are approved for a maximum of ${approvedReq.quantity} units, but your cart would contain ${currentCheckQty + quantity}.`);
          }

          await tx.cartItem.upsert({
            where: { cartId_productId: { cartId: cart.id, productId: productId } },
            update: { quantity: { increment: quantity } },
            create: { cartId: cart.id, productId: productId, quantity: quantity }
          });
        }, { isolationLevel: 'Serializable' });
      } catch (error) {
        return { success: false, error: error.message };
      }
    } else {
      await db.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: productId
          }
        },
        update: {
          quantity: { increment: quantity }
        },
        create: {
          cartId: cart.id,
          productId: productId,
          quantity: quantity
        }
      });
    }

    revalidatePath('/cart');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to add to cart" };
  }
}

/**
 * 3. REMOVE FROM CART
 * - Normal in-range products: hard-delete (standard e-commerce behavior).
 * - Approved out-of-range products: soft-hide by setting isRemovedFromCart=true on the
 *   SpecialDeliveryRequest. This preserves the 10-day approval timer and reserved stock
 *   allocation so the user can re-add without re-requesting.
 */
export async function removeFromCart(cartItemId) {
  await validateAction(standardRateLimit);
  const user = await currentUser();
  if (!user) return { success: false, error: "Not logged in" };

  try {
    const item = await db.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: { select: { userId: true } }, product: { select: { id: true } } }
    });

    const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
    if (dbUser?.role === 'admin' || dbUser?.role === 'super_admin') {
      return { success: false, error: "Unauthorized: Admins cannot have a cart." };
    }

    if (!item || item.cart.userId !== user.id) {
      return { success: false, error: "Item not found or unauthorized" };
    }

    // Check if this product has an active, non-consumed Special Delivery approval
    const activeApproval = await db.specialDeliveryRequest.findFirst({
      where: {
        userId: user.id,
        productId: item.product.id,
        status: 'APPROVED',
        isConsumed: false,
      }
    });

    if (activeApproval) {
      // CASE 2 — OUT-OF-RANGE APPROVED PRODUCT:
      // Soft-hide: mark the approval as removed from cart UI but preserve the reservation.
      // The CartItem is still fully deleted — it just won't reappear unless re-added.
      await db.specialDeliveryRequest.update({
        where: { id: activeApproval.id },
        data: { isRemovedFromCart: true }
      });
    }

    // Always hard-delete the CartItem itself (for both cases)
    await db.cartItem.delete({ where: { id: cartItemId } });

    revalidatePath('/cart');
    return { success: true, wasApproved: !!activeApproval };
  } catch (error) {
    return { success: false, error: "Failed to remove item." };
  }
}

/**
 * 4. UPDATE CART ITEM QUANTITY
 */
export async function updateCartItemQuantity(cartItemId, newQuantity) {
  await validateAction(standardRateLimit);
  const user = await currentUser();
  if (!user) return { success: false, error: "Not logged in" };

  try {
    if (isNaN(newQuantity) || newQuantity <= 0) {
      return { success: false, error: "Quantity must be a positive number." };
    }
    const item = await db.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: { select: { userId: true } },
        product: true
      }
    });

    const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
    if (dbUser?.role === 'admin' || dbUser?.role === 'super_admin') {
      return { success: false, error: "Unauthorized: Admins cannot have a cart." };
    }

    if (!item || item.cart.userId !== user.id) {
      return { success: false, error: "Item not found or unauthorized" };
    }

    // Check availability before updating
    const approvedReq = await db.specialDeliveryRequest.findFirst({
      where: { userId: user.id, productId: item.productId, status: 'APPROVED', isConsumed: false }
    });
    const sellableStock = await getSellableStock(item.productId, item.product.availableStock);
    const effectiveStockLimit = approvedReq ? approvedReq.quantity : sellableStock;

    if (effectiveStockLimit < newQuantity) {
      return { success: false, error: `Only ${effectiveStockLimit} available.` };
    }

    // Min Quantity Check
    const minQty = approvedReq ? 1 : (item.product.minOrderQuantity || 1);
    if (newQuantity < minQty) {
      return { success: false, error: `Minimum order is ${minQty} ${item.product.unit}.` };
    }

    await db.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: newQuantity }
    });

    revalidatePath('/cart');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update quantity" };
  }
}

/**
 * 5. CLEAR CART
 * Removes all items from the current user's cart without restoring stock (used after successful purchase)
 */
export async function clearCart() {
  const user = await currentUser();
  if (!user) return { success: false, error: "Not logged in" };

  try {
    const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
    if (dbUser?.role === 'admin' || dbUser?.role === 'super_admin') {
      return { success: false, error: "Unauthorized" };
    }

    const cart = await db.cart.findUnique({ where: { userId: user.id } });
    if (!cart) return { success: true };

    await db.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to clear cart" };
  }
}

/**
 * 6. RECONCILE CART ITEMS
 * Dynamically scans the user's cart against real-time database stock.
 * Deletes items with 0 stock, downscales items with insufficient stock.
 */
export async function reconcileCartItems() {
  const user = await currentUser();
  if (!user) return { success: false, messages: [] };

  try {
    const cart = await db.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (!cart || cart.items.length === 0) return { success: true, messages: [] };

    const messages = [];

    for (const item of cart.items) {
      const stock = item.product.availableStock;
      const sellableStock = await getSellableStock(item.productId, stock);

      const approvedReq = await db.specialDeliveryRequest.findFirst({
        where: { userId: user.id, productId: item.productId, status: 'APPROVED', isConsumed: false }
      });

      const effectiveStockLimit = approvedReq ? approvedReq.quantity : sellableStock;

      // If product has been completely sold out
      if (effectiveStockLimit <= 0) {
        await db.cartItem.delete({ where: { id: item.id } });
        messages.push(`"${item.product.productName}" was removed from your cart because it is now out of stock.`);
      }
      // If available stock dropped below requested quantity
      else if (effectiveStockLimit < item.quantity) {
        // Use effective min quantity to prevent hard-deleting approved items
        const effectiveMinQty = approvedReq ? 1 : (item.product.minOrderQuantity || 1);
        if (effectiveStockLimit < effectiveMinQty) {
          await db.cartItem.delete({ where: { id: item.id } });
          messages.push(`"${item.product.productName}" was removed from your cart because the remaining stock is below the minimum order quantity.`);
        } else {
          await db.cartItem.update({
            where: { id: item.id },
            data: { quantity: effectiveStockLimit }
          });
          messages.push(`Quantity for "${item.product.productName}" was reduced to ${effectiveStockLimit} ${item.product.unit} to match your approved mediation limit or stock availability.`);
        }
      }
    }

    if (messages.length > 0) {
      revalidatePath('/cart');
    }

    return { success: true, messages };
  } catch (err) {
    return { success: false, messages: [] };
  }
}