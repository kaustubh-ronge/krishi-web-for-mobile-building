import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { getAvailableDeliveryBoys, hireDeliveryBoy } from "@/actions/delivery-job";

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
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    
    if (!orderId) {
      return NextResponse.json({ success: false, error: "orderId is required" }, { status: 400 });
    }

    // Fetch order to get buyer location (lat/lng)
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                farmer: true,
                agent: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const firstItem = order.items[0];
    const seller = firstItem?.product?.farmer || firstItem?.product?.agent;

    const res = await getAvailableDeliveryBoys(
      order.lat, order.lng, orderId, seller?.lat, seller?.lng
    );

    return NextResponse.json({ success: !res.error, data: res.data || res.error });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { orderId, deliveryBoyId, distance } = body;

    if (!orderId || !deliveryBoyId) {
      return NextResponse.json({ success: false, error: "orderId and deliveryBoyId are required" }, { status: 400 });
    }

    const res = await hireDeliveryBoy(orderId, deliveryBoyId, distance);
    return NextResponse.json({ success: !res.error, ...res });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
