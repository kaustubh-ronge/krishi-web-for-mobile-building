import { NextResponse } from "next/server";
import { calculateDynamicDeliveryFee } from "@/actions/orders";

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
    const { searchParams } = new URL(req.url);
    
    const lat = parseFloat(searchParams.get("lat"));
    const lng = parseFloat(searchParams.get("lng"));
    const itemIds = searchParams.get("itemIds") ? searchParams.get("itemIds").split(",").filter(Boolean) : [];
    const productId = searchParams.get("productId") || null;

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ success: false, error: "Missing or invalid coordinates" }, { status: 400 });
    }

    const result = await calculateDynamicDeliveryFee(itemIds, lat, lng, productId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Mobile API /orders/fee Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
