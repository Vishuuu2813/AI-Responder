import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Registration is disabled on this platform." },
    { status: 403 }
  );
}
