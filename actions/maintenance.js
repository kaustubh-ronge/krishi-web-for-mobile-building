
"use server";

import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { ensureAdmin } from "./admin";


import { _reclaimAbandonedStockInternal } from "@/lib/maintenance-core";

/**
 * Background-friendly action to reclaim stock from abandoned/expired checkouts.
 * Should be triggered by a cron job or admin periodically.
 */
export async function reclaimAbandonedStock() {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        await ensureAdmin(user.id);
    } catch (error) {
        return { success: false, error: error.message };
    }

    const result = await _reclaimAbandonedStockInternal();
    
    if (result.success) {
        revalidatePath('/marketplace');
        revalidatePath('/farmer-dashboard');
        revalidatePath('/agent-dashboard');
    }

    return result;
}
