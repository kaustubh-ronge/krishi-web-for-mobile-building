import { NextResponse } from "next/server";
import { updateCartItemQuantity, removeFromCart } from "@/actions/cart";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, error: "Cart Item ID is required" }, { status: 400 });

    const body = await req.json();
    const { quantity } = body;

    if (quantity === undefined) {
      return NextResponse.json({ success: false, error: "Quantity is required" }, { status: 400 });
    }

    const result = await updateCartItemQuantity(id, quantity);

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, error: "Cart Item ID is required" }, { status: 400 });

    const result = await removeFromCart(id);

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
