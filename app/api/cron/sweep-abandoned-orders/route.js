import { NextResponse } from 'next/server';
import { _reclaimAbandonedStockInternal } from '@/lib/maintenance-core';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow up to 5 minutes to sweep large dbs

// Automates the reclamation of abandoned orders that were initiated
// but never fully paid or verified within the `expiresAt` window.
// 
// Vercel Cron Expression Example (vercel.json):
// "crons": [{ "path": "/api/cron/sweep-abandoned-orders", "schedule": "*/15 * * * *" }]
export async function GET(request) {
    try {
        const authHeader = request.headers.get('authorization');
        
        if (!process.env.CRON_SECRET) {
            console.error("CRON_SECRET is not configured");
            return new NextResponse("Server misconfiguration", { status: 500 });
        }
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        console.log('[CRON] Starting abandoned order sweep...');
        const result = await _reclaimAbandonedStockInternal();
        
        return NextResponse.json({
            success: true,
            message: "Abandoned stock sweep completed successfully",
            details: result
        }, { status: 200 });
        
    } catch (error) {
        console.error('[CRON] Abandoned Stock Sweep failed:', error);
        return NextResponse.json({
            success: false,
            error: "Failed to run sweep",
            details: error.message
        }, { status: 500 });
    }
}
