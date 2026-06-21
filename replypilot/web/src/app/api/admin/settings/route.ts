import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connect";
import { SystemSettings } from "@/models/SystemSettings";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as Record<string, unknown> & { role?: string })?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({
        defaultModel: "gpt-4o-mini",
        systemApiKey: "",
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as Record<string, unknown> & { role?: string })?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings();
    }

    if (body.defaultModel) settings.defaultModel = body.defaultModel;
    if (body.systemApiKey !== undefined) settings.systemApiKey = body.systemApiKey;

    await settings.save();

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
