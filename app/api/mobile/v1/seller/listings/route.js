import { NextResponse } from "next/server";
import { getMyListings, deleteListing, updateProductListing } from "@/actions/products";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const result = await getMyListings();

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Mobile API getMyListings Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ success: false, error: "Listing ID is required" }, { status: 400 });
    }

    const result = await deleteListing(id);
    
    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Listing deleted" });
  } catch (error) {
    console.error("Mobile API deleteListing Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ success: false, error: "Listing ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const formData = new FormData();

    Object.keys(body).forEach((key) => {
      if (Array.isArray(body[key])) {
        body[key].forEach((item) => formData.append(key, item));
      } else if (body[key] !== null && body[key] !== undefined) {
        formData.append(key, body[key].toString());
      }
    });

    const result = await updateProductListing(id, formData);
    
    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Listing updated" });
  } catch (error) {
    console.error("Mobile API updateListing Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
