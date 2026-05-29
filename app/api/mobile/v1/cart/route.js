import { NextResponse } from "next/server";
import { getCart, addToCart } from "@/actions/cart";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
    },
  });
}

export async function GET(req) {
  try {
    const result = await getCart();

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { productId, quantity } = body;

    if (!productId || !quantity) {
      return NextResponse.json({ success: false, error: "Product ID and quantity are required" }, { status: 400 });
    }

    const result = await addToCart(productId, quantity);

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.cartItem });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error", details: error.message }, { status: 500 });
  }
}
