import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connect";
import { User } from "@/models/User";
import { Settings } from "@/models/Settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: any = {
    authStatus: "pending",
    dbStatus: "pending",
    userQueryStatus: "pending",
    settingsQueryStatus: "pending",
    session: null,
    errors: {}
  };

  // 1. Check auth()
  try {
    const session = await auth();
    result.authStatus = "success";
    result.session = session;
  } catch (err: any) {
    result.authStatus = "failed";
    result.errors.auth = err?.message || err?.toString();
    result.errors.authStack = err?.stack;
  }

  // 2. Check DB connection
  try {
    await connectDB();
    result.dbStatus = "success";
  } catch (err: any) {
    result.dbStatus = "failed";
    result.errors.db = err?.message || err?.toString();
    result.errors.dbStack = err?.stack;
  }

  // 3. Check User model query
  try {
    if (result.dbStatus === "success") {
      const userCount = await User.countDocuments();
      result.userQueryStatus = `success (count: ${userCount})`;
      
      // If we have a session, let's try querying the specific user
      if (result.session?.user?.email) {
        const testUser = await User.findOne({ email: result.session.user.email.toLowerCase() });
        result.testUserFound = !!testUser;
        result.userId = testUser?._id?.toString() || null;
      }
    } else {
      result.userQueryStatus = "skipped (db failed)";
    }
  } catch (err: any) {
    result.userQueryStatus = "failed";
    result.errors.userQuery = err?.message || err?.toString();
    result.errors.userQueryStack = err?.stack;
  }

  // 4. Check Settings model query
  try {
    if (result.dbStatus === "success") {
      const settingsCount = await Settings.countDocuments();
      result.settingsQueryStatus = `success (count: ${settingsCount})`;
    } else {
      result.settingsQueryStatus = "skipped (db failed)";
    }
  } catch (err: any) {
    result.settingsQueryStatus = "failed";
    result.errors.settingsQuery = err?.message || err?.toString();
    result.errors.settingsQueryStack = err?.stack;
  }

  return NextResponse.json(result);
}
