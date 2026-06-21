import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connect";
import mongoose from "mongoose";
import { Analytics } from "@/models/Analytics";
import { Message } from "@/models/Message";
import { Conversation } from "@/models/Conversation";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "7d";

    const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const userId = new mongoose.Types.ObjectId(session.user.id);

    // Daily analytics
    const dailyStats = await Analytics.find({
      user: userId,
      date: { $gte: startDate },
    }).sort({ date: 1 }).lean();

    // Totals
    const totals = await Analytics.aggregate([
      { $match: { user: userId, date: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: "$totalMessages" },
          totalReplies: { $sum: "$totalReplies" },
          aiReplies: { $sum: "$aiReplies" },
          manualReplies: { $sum: "$manualReplies" },
          aiTokensUsed: { $sum: "$aiTokensUsed" },
          failedReplies: { $sum: "$failedReplies" },
        },
      },
    ]);

    // Active conversations
    const activeConversations = await Conversation.countDocuments({
      user: userId,
      lastMessageAt: { $gte: startDate },
    });

    // Recent messages
    const recentMessages = await Message.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      dailyStats,
      totals: totals[0] || {},
      activeConversations,
      recentMessages,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
