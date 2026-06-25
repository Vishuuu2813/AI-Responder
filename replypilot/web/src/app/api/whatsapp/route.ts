import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import axios from "axios";

const BOT_SERVICE_URL = "http://localhost:3001";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await axios.get(`${BOT_SERVICE_URL}/status?userId=${userId}`);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Proxy GET status error:", error.message);
    return NextResponse.json({
      status: "disconnected",
      qr: null,
      phoneNumber: null,
      message: "WhatsApp bot service offline or unreachable."
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
      const response = await axios.post(`${BOT_SERVICE_URL}/start`, { userId });
      return NextResponse.json(response.data);
    } else if (action === "logout") {
      const response = await axios.post(`${BOT_SERVICE_URL}/logout`, { userId });
      return NextResponse.json(response.data);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`Proxy POST error:`, error.message);
    return NextResponse.json({ error: "WhatsApp bot service error", details: error.message }, { status: 500 });
  }
}
