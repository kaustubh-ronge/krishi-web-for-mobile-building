import { NextResponse } from "next/server";
import { 
  createSpecialDeliveryRequest, 
  getUserSpecialDeliveryRequests, 
  markInquiryAsSent,
  deleteSpecialDeliveryRequest
} from "@/actions/special-delivery";
import { sendSupportMessage } from "@/actions/support";

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
    const result = await getUserSpecialDeliveryRequests();
    
    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, data: result.data || result });
  } catch (error) {
    console.error("Mobile API getUserSpecialDeliveryRequests Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, productId, quantity, sellerId, unit, name, message, productName } = body;

    if (action === "create_and_send") {
      // 1. Create the special delivery request
      const createRes = await createSpecialDeliveryRequest(productId, quantity || 1, sellerId, unit);
      
      if (createRes?.error || !createRes?.success) {
        return NextResponse.json({ success: false, error: createRes?.error || "Failed to initiate mediation" }, { status: 400 });
      }

      // 2. Send the support message
      const fullMessage = `Inquiry regarding: ${productName}\n` +
        `Quantity Requested: ${quantity || 'Not specified'} ${unit}\n` +
        `Buyer Name: ${name}\n` +
        `------------------\n` +
        `User Message: ${message || 'No message'}`;
        
      const supportRes = await sendSupportMessage(fullMessage, "SPECIAL_DELIVERY_MEDIATION");
      
      if (!supportRes.success) {
        return NextResponse.json({ success: false, error: supportRes.error || "Failed to send support message" }, { status: 400 });
      }

      // 3. Mark as sent
      await markInquiryAsSent(productId);
      
      return NextResponse.json({ success: true, message: "Mediation request submitted successfully." });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Mobile API special-delivery POST Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: "Request ID is required" }, { status: 400 });
    }

    const res = await deleteSpecialDeliveryRequest(id);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: "Request cancelled/cleared successfully" });
  } catch (error) {
    console.error("Mobile API special-delivery DELETE Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
