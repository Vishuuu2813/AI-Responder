import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connect";
import { Settings } from "@/models/Settings";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: No user ID in session" }, { status: 401 });
    }

    await connectDB();
    const settings = await Settings.findOne({ user: userId }).lean();

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Internal server error", details: error?.message || error?.toString() }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: No user ID in session" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    const settings = await Settings.findOneAndUpdate(
      { user: userId },
      { $set: body },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Internal server error", details: error?.message || error?.toString() }, { status: 500 });
  }
}
