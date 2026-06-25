import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connect";
import { Profile } from "@/models/Profile";
import crypto from "crypto";

// GET /api/profiles - List all profiles for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const profiles = await Profile.find({ user: userId }).sort({ createdAt: -1 });

    return NextResponse.json({ profiles });
  } catch (error: any) {
    console.error("GET /api/profiles error:", error);
    return NextResponse.json(
      { error: "Server error", details: error?.message || error?.toString() },
      { status: 500 }
    );
  }
}

// POST /api/profiles - Create a new profile (trained AI instance)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Profile name is required" }, { status: 400 });
    }

    await connectDB();

    // Generate unique API key starting with rp_prof_
    const apiKey = `rp_prof_${crypto.randomBytes(24).toString("hex")}`;

    const newProfile = await Profile.create({
      user: userId,
      name: name.trim(),
      apiKey,
      isEnabled: true,
      replyMode: "ai",
      whatsappSource: "both",
      ai: {
        useSystemKey: true,
        userApiKey: "",
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 500,
        language: "auto",
        tone: "friendly",
        replyLength: "medium",
        personality: "helpful assistant",
        customInstructions: "",
        memoryType: "short",
        memoryMessageCount: 5,
        greetingTemplate: "Hello {first_name}, welcome to " + name.trim() + " Support! How can I help you?",
        newAppLink: "",
        oldAppLink: "",
        websiteLink: "",
        whatsappSupport: "",
        minDeposit: 100,
        minWithdraw: 200,
        maxWithdraw: 50000,
        withdrawOpenTime: "10:00 AM",
        withdrawCloseTime: "04:00 PM",
        scannerUrl: "",
        scanners: [],
        paymentRecipientNames: [],
        paymentVerificationEnabled: false
      },
      switchCases: [],
      delay: {
        type: "instant",
        fixedSeconds: 1,
        randomMin: 1,
        randomMax: 5
      },
      ignoreGroups: true,
      replyInGroups: false,
      selectedGroupsOnly: false
    });

    return NextResponse.json({ profile: newProfile }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/profiles error:", error);
    return NextResponse.json(
      { error: "Server error", details: error?.message || error?.toString() },
      { status: 500 }
    );
  }
}
