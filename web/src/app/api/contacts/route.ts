import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connect";
import { Contact } from "@/models/Contact";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const contacts = await Contact.find({ user: session.user.id }).sort({ lastMessageAt: -1 }).lean();
  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const contact = await Contact.findOneAndUpdate(
    { user: session.user.id, phone: body.phone },
    { $set: { ...body, user: session.user.id } },
    { upsert: true, new: true }
  );
  return NextResponse.json({ contact }, { status: 201 });
}
