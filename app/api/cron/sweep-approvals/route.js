import { sweepExpiredSpecialDeliveries } from "@/actions/special-delivery";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow up to 5 minutes for sweep operations


export async function GET(request) {
    // 1. Verify Vercel Cron Security
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET) {
        console.error("CRON_SECRET is not configured");
        return new NextResponse("Server misconfiguration", { status: 500 });
    }
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const result = await sweepExpiredSpecialDeliveries();

        if (result.success) {
            return NextResponse.json({ success: true, message: "Sweep executed successfully." }, { status: 200 });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (error) {
        console.error("Cron route error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
