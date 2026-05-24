import { NextResponse } from "next/server";
import { getBuyerOrders, initiateCheckout, createCODOrder } from "@/actions/orders";

export async function GET(req) {
  try {
    const result = await getBuyerOrders();

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    console.error("Mobile API getBuyerOrders Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, idempotencyId } = body;

    if (action === "initiateCheckout") {
      const result = await initiateCheckout();
      if (result?.error) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: result });
    } 
    
    if (action === "createCODOrder") {
      if (!idempotencyId) {
        return NextResponse.json({ success: false, error: "idempotencyId is required for COD orders" }, { status: 400 });
      }
      const result = await createCODOrder(idempotencyId);
      if (result?.error) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Mobile API orders POST Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
