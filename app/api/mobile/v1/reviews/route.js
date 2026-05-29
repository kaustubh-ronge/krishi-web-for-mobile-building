import { NextResponse } from "next/server";
import { createReview } from "@/actions/reviews";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
    },
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { orderId, productId, rating, comment } = body;

    if (!orderId || !productId || !rating) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const formData = new FormData();
    formData.append("orderId", orderId);
    formData.append("productId", productId);
    formData.append("rating", rating.toString());
    formData.append("comment", comment || "");

    const res = await createReview(formData);
    
    return NextResponse.json({ success: res.success, data: res.message || res.error, error: res.error });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
