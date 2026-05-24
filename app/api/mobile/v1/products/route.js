import { NextResponse } from "next/server";
import { getMarketplaceListings, createProductListing } from "@/actions/products";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const params = {
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "12", 10),
      search: searchParams.get("search") || "",
      category: searchParams.get("category") || "All",
      sellerType: searchParams.get("sellerType") || "all",
      sortBy: searchParams.get("sortBy") || "newest",
      region: searchParams.get("region") || "",
      district: searchParams.get("district") || ""
    };

    const result = await getMarketplaceListings(params);

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    console.error("Mobile API getMarketplaceListings Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const formData = new FormData();

    // Iterate over body keys and append to FormData
    Object.keys(body).forEach((key) => {
      if (Array.isArray(body[key])) {
        // Handle array of strings (e.g., images)
        body[key].forEach((item) => formData.append(key, item));
      } else if (body[key] !== null && body[key] !== undefined) {
        formData.append(key, body[key].toString());
      }
    });

    const result = await createProductListing(formData);

    if (result?.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Mobile API createProductListing Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
