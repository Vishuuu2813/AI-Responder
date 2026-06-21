import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connect";
import { Rule } from "@/models/Rule";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const rules = await Rule.find({ user: session.user.id }).sort({ priority: -1 }).lean();

    return NextResponse.json({ rules });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { name, keyword, reply, isRegex, caseSensitive, priority, source } = body;

    if (!name || !keyword || !reply) {
      return NextResponse.json({ error: "Name, keyword and reply are required" }, { status: 400 });
    }

    const rule = await Rule.create({
      user: session.user.id,
      name,
      keyword,
      reply,
      isRegex: isRegex || false,
      caseSensitive: caseSensitive || false,
      priority: priority || 0,
      source: source || "both",
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
