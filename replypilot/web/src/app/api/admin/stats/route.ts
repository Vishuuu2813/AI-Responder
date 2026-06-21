import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connect";
import { User } from "@/models/User";
import { Analytics } from "@/models/Analytics";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as Record<string, unknown> & { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  await connectDB();
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true, lastSeen: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
  const msgAgg = await Analytics.aggregate([{ $group: { _id: null, total: { $sum: "$totalMessages" } } }]);
  return NextResponse.json({ stats: { totalUsers, activeUsers, totalMessages: msgAgg[0]?.total || 0, totalRevenue: 0 } });
}
