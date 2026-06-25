import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import axios from "axios";

const BOT_SERVICE_URL = "http://127.0.0.1:3001";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "diagnostics") {
      const response = await axios.get(`${BOT_SERVICE_URL}/diagnostics`, { responseType: 'text', timeout: 5000 });
      return new NextResponse(response.data, {
        headers: { "Content-Type": "text/plain" }
      });
    }

    const response = await axios.get(`${BOT_SERVICE_URL}/status?userId=${userId}`, { timeout: 5000 });
    return NextResponse.json(response.data);
  } catch (error: any) {
    // Bot service not yet ready — return disconnected gracefully (not 500)
    return NextResponse.json({
      status: "disconnected",
      qr: null,
      phoneNumber: null
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "start") {
      const response = await axios.post(`${BOT_SERVICE_URL}/start`, { userId }, { timeout: 10000 });
      return NextResponse.json(response.data);
    } else if (action === "logout") {
      const response = await axios.post(`${BOT_SERVICE_URL}/logout`, { userId }, { timeout: 5000 });
      return NextResponse.json(response.data);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`[WhatsApp Proxy] Error:`, error.message);
    return NextResponse.json(
      { error: "WhatsApp bot service not ready. Please wait a moment and try again." },
      { status: 503 }
    );
  }
}

