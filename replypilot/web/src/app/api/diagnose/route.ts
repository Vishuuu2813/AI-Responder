import { NextResponse } from "next/server";

export async function GET() {
  const result: any = {
    step1_auth: "pending",
    step2_db: "pending",
    errors: {}
  };

  // 1. Try to run auth()
  try {
    const { auth } = await import("@/lib/auth/auth");
    const session = await auth();
    result.step1_auth = "success";
    result.session = session;
  } catch (err: any) {
    result.step1_auth = "failed";
    result.errors.auth = err?.message || err?.toString() || "Unknown error";
    if (err?.stack) result.errors.authStack = err.stack;
  }

  // 2. Try to run connectDB()
  try {
    const connectDB = (await import("@/lib/db/connect")).default;
    await connectDB();
    result.step2_db = "success";
  } catch (err: any) {
    result.step2_db = "failed";
    result.errors.db = err?.message || err?.toString() || "Unknown error";
    if (err?.stack) result.errors.dbStack = err.stack;
  }

  return NextResponse.json(result);
}
