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

function flattenObject(obj: any, prefix = ""): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, path));
    } else {
      result[path] = value;
    }
  }
  return result;
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

    let settings = await Settings.findOne({ user: userId });
    if (!settings) {
      settings = new Settings({ user: userId });
    }

    const flatBody = flattenObject(body);
    for (const key of Object.keys(flatBody)) {
      settings.set(key, flatBody[key]);
    }

    await settings.save();

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Internal server error", details: error?.message || error?.toString() }, { status: 500 });
  }
}
