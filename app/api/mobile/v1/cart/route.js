import { NextResponse } from "next/server";
import { getCart, addToCart } from "@/actions/cart";

export async function GET(req) {
  try {
    const result = await getCart();

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.cart });
  } catch (error) {
    console.error("Mobile API getCart Error:", error);
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
    console.error("Mobile API addToCart Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
