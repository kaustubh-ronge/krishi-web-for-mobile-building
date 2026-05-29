import { NextResponse } from "next/server";
import { getBuyerOrders, initiateCheckout, cancelPendingOrder } from "@/actions/orders";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("id");

    const result = await getBuyerOrders();

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const orders = result.data || result || [];

    // If requesting a specific order by ID, return just that one
    if (orderId) {
      const order = orders.find((o) => o.id === orderId);
      if (!order) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: order });
    }

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}


export async function POST(req) {
  try {
    const body = await req.json();
    const { action, idempotencyId } = body;

    if (action === "initiateCheckout") {
      const result = await initiateCheckout(body.params); // Pass params which includes addressData etc.
      if (result?.error) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: result });
    } 
    
    if (action === "cancelPending") {
      const result = await cancelPendingOrder(body.orderId);
      if (result?.error) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
