import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connect";
import mongoose from "mongoose";
import { Message } from "@/models/Message";
import { Conversation } from "@/models/Conversation";
import { Settings } from "@/models/Settings";
import { Analytics } from "@/models/Analytics";
import { Contact } from "@/models/Contact";
import { User } from "@/models/User";
import { Profile } from "@/models/Profile";
import { generateAIReply } from "@/lib/ai/openai";
import { matchManualRule } from "@/lib/ai/rules-engine";
import { isWithinBusinessHours } from "@/lib/utils/business-hours";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

// POST /api/messages/incoming — Called by Android app or Chrome extension
export async function POST(req: NextRequest) {
  try {
    // Verify API key from Android app
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    let user;
    let settings: any;
    let profile: any = null;

    // Try finding profile first
    profile = await Profile.findOne({ apiKey }).populate("user");
    if (profile) {
      user = profile.user;
      settings = profile;
    } else {
      user = await User.findOne({ apiKey });
      if (!user) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
      }
      settings = await Settings.findOne({ user: user._id });
    }

    const body = await req.json();
    const { contactName, contactPhone, content, source, isGroup, groupName } = body;

    if (!contactName || !contactPhone || !content || !source) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!settings || !settings.isEnabled) {
      return NextResponse.json({ reply: null, reason: "Auto-reply disabled" });
    }

    // Check source filter
    if (settings.whatsappSource !== "both" && settings.whatsappSource !== source) {
      return NextResponse.json({ reply: null, reason: "Source filtered" });
    }

    // Check group filters
    if (isGroup && settings.ignoreGroups) {
      return NextResponse.json({ reply: null, reason: "Groups ignored" });
    }

    // Check contact blocklist
    const contact = await Contact.findOne({ user: user._id, phone: contactPhone });
    if (contact?.type === "blocked") {
      return NextResponse.json({ reply: null, reason: "Contact blocked" });
    }

    // Check business hours (if present in settings)
    if (settings.businessHours && settings.businessHours.enabled) {
      const businessHoursCheck = isWithinBusinessHours(settings.businessHours);
      if (!businessHoursCheck.isOpen) {
        return NextResponse.json({
          reply: settings.businessHours.awayMessage,
          reason: "Outside business hours",
        });
      }
    }

    // Get or create conversation
    const convQuery: any = { contactPhone, source };
    if (profile) {
      convQuery.profile = profile._id;
    } else {
      convQuery.user = user._id;
      convQuery.$or = [{ profile: { $exists: false } }, { profile: null }];
    }

    let conversation = await Conversation.findOne(convQuery);

    if (!conversation) {
      conversation = await Conversation.create({
        user: user._id,
        profile: profile ? profile._id : undefined,
        contactName,
        contactPhone,
        source,
        isGroup,
        groupName,
        context: [],
      });
    }

    // Save incoming message
    const incomingMessage = await Message.create({
      user: user._id,
      profile: profile ? profile._id : undefined,
      conversation: conversation._id,
      contactName,
      contactPhone,
      direction: "incoming",
      content,
      source,
      isGroupMessage: isGroup,
      groupName,
      replyStatus: "pending",
    });

    let reply: string | null = null;
    let replyMode: "ai" | "manual" | "hybrid" | "none" = "none";
    let tokensUsed = 0;
    let ruleId: string | undefined;

    // 1. Check Profile's custom switch-cases (quick replies) first if using profile
    if (profile && profile.switchCases && profile.switchCases.length > 0) {
      const trimmedContent = content.trim().toLowerCase();
      const matchedCase = profile.switchCases.find(
        (c: any) => c.isActive && c.keyword.trim().toLowerCase() === trimmedContent
      );
      if (matchedCase) {
        reply = matchedCase.reply;
        replyMode = "manual";
      }
    }

    // 2. Determine reply based on mode (if no switch-case match)
    if (!reply && (settings.replyMode === "manual" || settings.replyMode === "hybrid")) {
      const ruleMatch = await matchManualRule(user._id.toString(), content);
      if (ruleMatch.matched) {
        reply = ruleMatch.reply!;
        replyMode = "manual";
        ruleId = ruleMatch.ruleId;
      }
    }

    if (!reply && (settings.replyMode === "ai" || settings.replyMode === "hybrid")) {
      const history = conversation.context.slice(-settings.ai.memoryMessageCount);
      const aiResult = await generateAIReply({
        userId: user._id.toString(),
        profileId: profile ? profile._id.toString() : undefined,
        message: content,
        contactName,
        conversationHistory: history,
      });
      reply = aiResult.reply;
      replyMode = "ai";
      tokensUsed = aiResult.tokensUsed;
    }

    if (!reply) {
      await Message.updateOne({ _id: incomingMessage._id }, { replyStatus: "skipped" });
      return NextResponse.json({ reply: null, reason: "No reply generated" });
    }

    // Calculate delay
    let delayMs = 0;
    if (settings.delay.type === "fixed") {
      delayMs = settings.delay.fixedSeconds * 1000;
    } else if (settings.delay.type === "random") {
      const min = settings.delay.randomMin * 1000;
      const max = settings.delay.randomMax * 1000;
      delayMs = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Update conversation context
    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $push: {
          context: [
            { role: "user", content, timestamp: new Date() },
            { role: "assistant", content: reply, timestamp: new Date() },
          ],
        },
        lastMessage: reply,
        lastMessageAt: new Date(),
        $inc: { messageCount: 1, replyCount: 1 },
      }
    );

    // Update incoming message with reply
    await Message.updateOne(
      { _id: incomingMessage._id },
      {
        replyContent: reply,
        replyMode,
        replyStatus: "sent",
        aiTokensUsed: tokensUsed,
        ruleId,
        sentAt: new Date(),
      }
    );

    // Update daily analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Analytics.findOneAndUpdate(
      { user: user._id, date: today },
      {
        $inc: {
          totalMessages: 1,
          totalReplies: 1,
          aiReplies: replyMode === "ai" ? 1 : 0,
          manualReplies: replyMode === "manual" ? 1 : 0,
          aiTokensUsed: tokensUsed,
        },
        $addToSet: { uniqueContacts: contactPhone },
      },
      { upsert: true }
    );

    return NextResponse.json({
      reply,
      delay: delayMs,
      replyMode,
    });
  } catch (error: any) {
    console.error("Incoming message error:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: error?.message || "Unknown error"
    }, { status: 500 });
  }
}

// GET /api/messages/incoming — Dashboard fetch
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const profileId = searchParams.get("profileId");
    const skip = (page - 1) * limit;

    const userId = new mongoose.Types.ObjectId(session.user.id);
    const query: any = { user: userId };

    if (profileId && profileId !== "all") {
      if (profileId === "legacy") {
        query.$or = [{ profile: { $exists: false } }, { profile: null }];
      } else {
        query.profile = new mongoose.Types.ObjectId(profileId);
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Message.countDocuments(query);

    return NextResponse.json({ messages, total, page, limit });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
