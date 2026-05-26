import { NextResponse } from "next/server";
import { getUserPendingOrders } from "@/actions/orders";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const result = await getUserPendingOrders();
    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error("Mobile API getUserPendingOrders Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
