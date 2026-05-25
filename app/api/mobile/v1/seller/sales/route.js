import { NextResponse } from "next/server";
import { getSellerSales } from "@/actions/orders";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const result = await getSellerSales();

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Mobile API getSellerSales Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/** Order status updates belong on /api/mobile/v1/seller/orders (order-tracking). */
export async function PUT() {
  return NextResponse.json(
    { success: false, error: "Use PUT /api/mobile/v1/seller/orders for order status updates" },
    { status: 410 }
  );
}
