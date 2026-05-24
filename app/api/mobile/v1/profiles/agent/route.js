import { NextResponse } from "next/server";
import { createAgentProfile, updateAgentProfile } from "@/actions/agent-profile";

export async function POST(req) {
  try {
    const body = await req.json();
    const formData = new FormData();

    Object.keys(body).forEach((key) => {
      if (Array.isArray(body[key])) {
        body[key].forEach((item) => formData.append(key, item));
      } else if (body[key] !== null && body[key] !== undefined) {
        formData.append(key, body[key].toString());
      }
    });

    const result = await createAgentProfile(formData);

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Mobile API createAgentProfile Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const formData = new FormData();

    Object.keys(body).forEach((key) => {
      if (Array.isArray(body[key])) {
        body[key].forEach((item) => formData.append(key, item));
      } else if (body[key] !== null && body[key] !== undefined) {
        formData.append(key, body[key].toString());
      }
    });

    const result = await updateAgentProfile(formData);

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Mobile API updateAgentProfile Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
