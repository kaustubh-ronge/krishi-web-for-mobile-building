import { getUserNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "@/actions/notifications";
import { NextResponse } from "next/server";


export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const result = await getUserNotifications();

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data || result || [] });
  } catch (error) {
    console.error("Mobile API getUserNotifications Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// Support both POST (from mobile) and PATCH for marking notifications read
async function handleMarkRead(req) {
  try {
    const body = await req.json();
    const { notificationId, markAll } = body;

    let result;
    if (markAll) {
      result = await markAllNotificationsAsRead();
    } else if (notificationId) {
      result = await markNotificationAsRead(notificationId);
    } else {
      return NextResponse.json({ success: false, error: "notificationId or markAll required" }, { status: 400 });
    }

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Mobile API markNotification Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) { return handleMarkRead(req); }
export async function PATCH(req) { return handleMarkRead(req); }
