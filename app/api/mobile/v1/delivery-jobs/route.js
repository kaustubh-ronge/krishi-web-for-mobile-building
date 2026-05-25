import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { updateDeliveryJobStatus, completeDeliveryWithOtp, updateLiveLocation } from "@/actions/delivery-job";

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

    const boy = await db.deliveryProfile.findUnique({
      where: { userId: user.id }
    });

    if (!boy) return NextResponse.json({ success: false, error: "Delivery profile not found" }, { status: 404 });

    const jobs = await db.deliveryJob.findMany({
      where: { deliveryBoyId: boy.id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  include: {
                    farmer: { select: { name: true, phone: true, lat: true, lng: true, address: true, city: true, state: true } },
                    agent: { select: { companyName: true, phone: true, lat: true, lng: true, address: true, city: true, state: true } },
                  }
                }
              }
            },
            buyerUser: { select: { firstName: true, lastName: true, phone: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: jobs });
  } catch (error) {
    console.error("Mobile Delivery Jobs GET Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, jobId, status, notes, lat, lng, otp } = body;

    if (!jobId) {
      return NextResponse.json({ success: false, error: "Job ID required" }, { status: 400 });
    }

    if (action === "update_status") {
      const res = await updateDeliveryJobStatus(jobId, status, notes || "", lat, lng);
      return NextResponse.json({ success: !res.error, ...res });
    }

    if (action === "complete_otp") {
      const res = await completeDeliveryWithOtp(jobId, otp, lat, lng);
      return NextResponse.json({ success: !res.error, ...res });
    }

    if (action === "update_location") {
      const res = await updateLiveLocation(jobId, lat, lng);
      return NextResponse.json({ success: !res.error, ...res });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Mobile Delivery Jobs POST Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
