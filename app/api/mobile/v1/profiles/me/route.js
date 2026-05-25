import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user with all possible profiles
    const dbUser = await db.user.findUnique({
      where: { id: clerkUser.id },
      include: {
        farmerProfile: true,
        agentProfile: true,
        deliveryProfile: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found in database" }, { status: 404 });
    }

    if (dbUser.isDisabled) {
      return NextResponse.json({ success: false, error: "Account is disabled" }, { status: 403 });
    }

    const role = dbUser.role;
    let profile = null;

    if (role === "farmer") {
      profile = dbUser.farmerProfile;
    } else if (role === "agent") {
      profile = dbUser.agentProfile;
    } else if (role === "delivery") {
      profile = dbUser.deliveryProfile;
    }

    return NextResponse.json({
      success: true,
      data: {
        role,
        profile,
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      },
    });
  } catch (error) {
    console.error("Mobile API profiles/me Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
