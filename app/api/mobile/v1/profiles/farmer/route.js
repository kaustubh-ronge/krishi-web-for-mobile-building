import { NextResponse } from "next/server";
import { createFarmerProfile, updateFarmerProfile } from "@/actions/farmer-profile";

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

    const result = await createFarmerProfile(formData);

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Mobile API createFarmerProfile Error:", error);
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

    const result = await updateFarmerProfile(formData);

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Mobile API updateFarmerProfile Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
