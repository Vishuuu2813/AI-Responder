import { NextResponse } from "next/server";

export async function GET() {
  const checks = {
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      MONGODB_URI: !!process.env.MONGODB_URI ? "SET ✅" : "MISSING ❌",
      AUTH_SECRET: !!process.env.AUTH_SECRET ? "SET ✅" : "MISSING ❌",
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET ? "SET ✅" : "MISSING ❌",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "MISSING ❌",
      NODE_ENV: process.env.NODE_ENV || "unknown",
    },
    mongodb: "not tested",
  };

  // Test MongoDB connection
  try {
    const connectDB = (await import("@/lib/db/connect")).default;
    await connectDB();
    checks.mongodb = "Connected ✅";
  } catch (err: any) {
    checks.mongodb = `Failed ❌: ${err?.message || "Unknown error"}`;
  }

  return NextResponse.json(checks);
}
