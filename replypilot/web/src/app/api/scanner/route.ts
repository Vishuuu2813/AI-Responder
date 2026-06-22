import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connect";
import { Settings } from "@/models/Settings";
import { User } from "@/models/User";

// ─── CORS helper ─────────────────────────────────────────────
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
  };
}

// Handle OPTIONS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders() });
}

// GET — fetch all scanner configs (API key or session)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const apiKey = req.headers.get("x-api-key");
    let userId: string | null = null;

    if (apiKey) {
      const user = await User.findOne({ apiKey });
      if (!user) return NextResponse.json({ error: "Invalid API key" }, { status: 401, headers: corsHeaders() });
      userId = user._id.toString();
    } else {
      const session = await auth();
      userId = session?.user?.id ?? null;
      if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });
    }

    const settings = await Settings.findOne({ user: userId });
    const rawScanners = settings?.ai?.scanners || [];

    const scanners = rawScanners
      .map((s: string) => {
        try { return typeof s === "string" ? JSON.parse(s) : s; }
        catch { return null; }
      })
      .filter(Boolean);

    return NextResponse.json({ scanners }, { headers: corsHeaders() });
  } catch (e: any) {
    console.error("GET /api/scanner error:", e);
    return NextResponse.json({ error: e.message }, { status: 500, headers: corsHeaders() });
  }
}

// POST — add a new scanner config (session only)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });

    const body = await req.json();
    const { name, keywords, imageBase64 } = body;

    if (!name || !imageBase64) {
      return NextResponse.json({ error: "name and imageBase64 are required" }, { status: 400, headers: corsHeaders() });
    }

    const newScanner = {
      id: Date.now().toString(),
      name: name.trim(),
      keywords: (keywords || []).map((k: string) => k.toLowerCase().trim()).filter(Boolean),
      imageBase64,
      createdAt: new Date().toISOString(),
    };

    const settings = await Settings.findOne({ user: userId });
    if (!settings) return NextResponse.json({ error: "Settings not found" }, { status: 404, headers: corsHeaders() });

    const existing = settings.ai.scanners || [];
    existing.push(JSON.stringify(newScanner));

    await Settings.updateOne({ user: userId }, { $set: { "ai.scanners": existing } });

    return NextResponse.json({ success: true, scanner: newScanner }, { headers: corsHeaders() });
  } catch (e: any) {
    console.error("POST /api/scanner error:", e);
    return NextResponse.json({ error: e.message }, { status: 500, headers: corsHeaders() });
  }
}

// DELETE — remove a scanner by id (session only)
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });

    const { id } = await req.json();
    const settings = await Settings.findOne({ user: userId });
    if (!settings) return NextResponse.json({ error: "Settings not found" }, { status: 404, headers: corsHeaders() });

    const filtered = (settings.ai.scanners || []).filter((s: string) => {
      try { return JSON.parse(s).id !== id; }
      catch { return true; }
    });

    await Settings.updateOne({ user: userId }, { $set: { "ai.scanners": filtered } });

    return NextResponse.json({ success: true }, { headers: corsHeaders() });
  } catch (e: any) {
    console.error("DELETE /api/scanner error:", e);
    return NextResponse.json({ error: e.message }, { status: 500, headers: corsHeaders() });
  }
}
