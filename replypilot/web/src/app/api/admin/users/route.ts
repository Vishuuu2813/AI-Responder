import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connect";
import { User } from "@/models/User";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as Record<string, unknown> & { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  await connectDB();
  const users = await User.find().sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ users });
}
