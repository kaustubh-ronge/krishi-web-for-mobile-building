
"use server";

import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function selectRole(formData) {
  // selectRole invoked
  const role = formData.get("role")?.toString();
  // Role selected from form

  let user;
  try {
    user = await currentUser();
    if (!user || !user.id) throw new Error("User not found via currentUser()");
    // Clerk user fetched from currentUser
  } catch (err) {
    return { error: "Failed to get user information." };
  }
  const userId = user.id;

  if (role !== "farmer" && role !== "agent" && role !== "delivery") {
    return { error: "Invalid role selected." };
  }

  try {
    const existingUser = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (existingUser?.role && existingUser.role !== "none") {
      // User already has a role
      return {
        error: "Role already selected",
        message: `You are already registered as a ${existingUser.role}. Role cannot be changed.`,
        existingRole: existingUser.role,
      };
    }
  } catch (err) {
    return { error: "Failed to verify user role." };
  }

  try {
    // 1. Update Database FIRST (Primary Source of Truth)
    // We use upsert because mobile app users bypass the web's checkUser logic during signup
    const email = user.emailAddresses?.[0]?.emailAddress || "unknown@krishiconnect.com";
    await db.user.upsert({
      where: { id: userId },
      update: { role: role },
      create: { id: userId, email: email, role: role },
    });
  } catch (err) {
    return { error: "Database error updating role. Please try again." };
  }

  try {
    // 2. Synchronize with Clerk (Secondary)
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: role },
    });
  } catch (err) {}

  revalidatePath("/", "layout");
  return { success: true, redirectUrl: `/${role}-dashboard` };
}
