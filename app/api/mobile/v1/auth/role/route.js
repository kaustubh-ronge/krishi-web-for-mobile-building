import { NextResponse } from "next/server";
import { selectRole } from "@/actions/users";

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

export async function POST(req) {
  try {
    const body = await req.json();
    const role = body.role;

    if (!role) {
      return NextResponse.json({ success: false, error: "Role is required." }, { status: 400 });
    }

    const formData = new FormData();
    formData.append("role", role);

    const result = await selectRole(formData);

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Mobile API selectRole Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
