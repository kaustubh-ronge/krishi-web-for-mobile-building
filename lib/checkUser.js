import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress;

    const newUser = await db.user.upsert({
      where: {
        id: clerkUser.id
      },
      update: {
        email: email,
      },
      create: {
        id: clerkUser.id,
        email: email,
        role: "none", // Default role for NEW users only
      },
    });

    return newUser;

  } catch (error) {
    console.log("Handled Error in checkUser (Clerk API):", error?.message || "Unknown error");
    return null;
  }
};