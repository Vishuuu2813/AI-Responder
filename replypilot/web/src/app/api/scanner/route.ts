import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET — fetch all scanner configs for this user
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Support both API key (extension) and session (dashboard)
    const apiKey = req.headers.get("x-api-key");
    let user: any = null;

    if (apiKey) {
      user = await User.findOne({ apiKey });
    } else {
      const session = await getServerSession(authOptions as any);
      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      user = await User.findOne({ email: session.user.email });
    }

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const settings = await Settings.findOne({ user: user._id });
    const rawScanners = settings?.ai?.scanners || [];

    // Parse scanner JSON strings
    const scanners = rawScanners
      .map((s: string) => {
        try { return typeof s === "string" ? JSON.parse(s) : s; }
        catch { return null; }
      })
      .filter(Boolean);

    return NextResponse.json({ scanners });
  } catch (e: any) {
    console.error("GET /api/scanner error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — add a new scanner config
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions as any);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { name, keywords, imageBase64 } = body;

    if (!name || !imageBase64) {
      return NextResponse.json({ error: "name and imageBase64 are required" }, { status: 400 });
    }

    const newScanner = {
      id: Date.now().toString(),
      name: name.trim(),
      keywords: (keywords || []).map((k: string) => k.toLowerCase().trim()).filter(Boolean),
      imageBase64,
      createdAt: new Date().toISOString(),
    };

    const settings = await Settings.findOne({ user: user._id });
    if (!settings) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    }

    const existing = settings.ai.scanners || [];
    existing.push(JSON.stringify(newScanner));

    await Settings.updateOne(
      { user: user._id },
      { $set: { "ai.scanners": existing } }
    );

    return NextResponse.json({ success: true, scanner: newScanner });
  } catch (e: any) {
    console.error("POST /api/scanner error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — remove a scanner by id
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions as any);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await req.json();
    const settings = await Settings.findOne({ user: user._id });
    if (!settings) return NextResponse.json({ error: "Settings not found" }, { status: 404 });

    const filtered = (settings.ai.scanners || []).filter((s: string) => {
      try { return JSON.parse(s).id !== id; }
      catch { return true; }
    });

    await Settings.updateOne(
      { user: user._id },
      { $set: { "ai.scanners": filtered } }
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("DELETE /api/scanner error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
