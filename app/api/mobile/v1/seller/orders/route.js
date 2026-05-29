import { NextResponse } from "next/server";
import { getSellerOrders, updateOrderStatus } from "@/actions/order-tracking";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
    },
  });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getSellerOrders(page, limit);

    if (!result?.success) {
      return NextResponse.json(
        { success: false, error: result?.error || result?.message || "Failed to fetch orders" },
        { status: 400 }
      );
    }

    const payload = result.data || result;
    return NextResponse.json({
      success: true,
      data: payload.data ?? payload,
      total: payload.total,
      hasMore: payload.hasMore,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { orderId, status, notes, lat, lng } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: "orderId and status are required" },
        { status: 400 }
      );
    }

    const formData = new FormData();
    formData.append("orderId", orderId);
    formData.append("status", status);
    if (notes) formData.append("notes", notes);
    if (lat != null) formData.append("lat", String(lat));
    if (lng != null) formData.append("lng", String(lng));

    const result = await updateOrderStatus(formData);

    if (!result?.success) {
      return NextResponse.json(
        { success: false, error: result?.error || result?.message || "Failed to update order" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: result.message || "Order updated successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
