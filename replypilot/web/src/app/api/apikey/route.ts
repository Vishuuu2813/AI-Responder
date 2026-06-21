import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connect";
import { User } from "@/models/User";
import crypto from "crypto";

// GET — return current API key
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ apiKey: user.apiKey || null });
  } catch (err) {
    console.error("GET apikey error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — generate a new API key
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const newKey = `rp_${crypto.randomBytes(24).toString("hex")}`;
    user.apiKey = newKey;
    await user.save();

    return NextResponse.json({ apiKey: newKey });
  } catch (err) {
    console.error("POST apikey error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
