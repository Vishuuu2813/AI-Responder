import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import OpenAI from "openai";
import { Settings } from "@/models/Settings";
import { SystemSettings } from "@/models/SystemSettings";
import { PaymentRecord } from "@/models/PaymentRecord";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

// POST /api/payment/screenshot — Called by Android app / extension when user sends a payment image
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { User } = await import("@/models/User");
    const user = await User.findOne({ apiKey });
    if (!user) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const settings = await Settings.findOne({ user: user._id });
    if (!settings) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    }

    // Check if payment verification is enabled
    if (!settings.ai.paymentVerificationEnabled) {
      return NextResponse.json({
        verified: false,
        action: "disabled",
        reply: `📸 *Payment screenshot mila!*\n\nAbhi automatic verification setup nahi hai.\n\nPlease apna screenshot admin ko forward karo ya directly support se contact karo:\n📞 *+${settings.ai.whatsappSupport || "917339987622"}*\n\nHum jald se jald aapke points add kar denge. 🙏`,
        reason: "Payment verification disabled",
      });
    }

    const body = await req.json();
    const { contactPhone, contactName, imageBase64 } = body;

    if (!contactPhone || !imageBase64) {
      return NextResponse.json({ error: "Missing contactPhone or imageBase64" }, { status: 400 });
    }

    // Get OpenAI key
    const sysSettings = await SystemSettings.findOne();
    const openaiKey = settings.ai.useSystemKey
      ? sysSettings?.systemApiKey || process.env.OPENAI_API_KEY
      : settings.ai.userApiKey;

    if (!openaiKey) {
      return NextResponse.json({ error: "No OpenAI API key configured" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // ─── Step 1: Use GPT-4o Vision to extract payment details ───────────────
    const extractionPrompt = `You are a payment screenshot analyzer. Extract payment details from this screenshot.

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation):
{
  "isPaymentScreenshot": true/false,
  "isComplete": true/false,
  "transactionId": "string or null",
  "amount": number or null,
  "recipientName": "string or null",
  "senderName": "string or null",
  "paymentMethod": "PhonePe/GPay/Paytm/Bank Transfer/NEFT/IMPS/UPI/Other or null",
  "paymentDate": "string or null",
  "paymentTime": "string or null",
  "upiId": "string or null",
  "status": "SUCCESS/FAILED/PENDING or null",
  "incompleteReason": "string describing what is missing, or null if complete"
}

Rules:
- isPaymentScreenshot: false if this is not a payment/transaction screenshot
- isComplete: false if important fields like transactionId, amount, or recipientName are missing/cut off
- recipientName: the name of the person/merchant who received the money
- Extract exactly as shown in the screenshot, do not guess`;

    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: extractionPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0,
    });

    const rawContent = visionResponse.choices[0]?.message?.content || "{}";

    // Parse JSON safely
    let extracted: any = {};
    try {
      // Remove markdown code fences if present
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extracted = JSON.parse(cleaned);
    } catch {
      extracted = { isPaymentScreenshot: false, isComplete: false };
    }

    // ─── Step 2: Not a payment screenshot ────────────────────────────────────
    if (!extracted.isPaymentScreenshot) {
      return NextResponse.json({
        verified: false,
        action: "not_payment",
        reply: `❌ *Yeh payment screenshot nahi lagta!*\n\nBhai, please apna *payment confirmation screenshot* bhejo jisme transaction details clearly dikhe. 📸`,
      });
    }

    // ─── Step 3: Handle missing TX ID — generate one from timestamp ──────────
    // If screenshot is incomplete but has amount, generate a TX ID from phone + timestamp
    if (!extracted.transactionId && extracted.amount) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const generatedTxId = `TXN-${(contactPhone || "UNKNOWN").replace(/\D/g, "").slice(-6)}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      extracted.transactionId = generatedTxId;
      extracted.isComplete = true; // treat as complete since we have amount
    }

    // ─── Step 3b: Incomplete screenshot ──────────────────────────────────────
    if (!extracted.isComplete || !extracted.amount) {
      const reason = extracted.incompleteReason || "Amount ya payment details clearly nahi dikh rahe";
      return NextResponse.json({
        verified: false,
        action: "incomplete",
        reply: `📸 *Screenshot incomplete hai!*\n\n${reason}\n\nPlease *pura screenshot* bhejo jisme yeh clearly dike:\n✅ Amount
✅ Recipient name\n✅ Date & Time\n\nBina complete screenshot ke points add nahi ho sakte. 🙏`,
      });
    }

    // ─── Step 4: Check if payment status is SUCCESS ───────────────────────────
    if (extracted.status && extracted.status !== "SUCCESS") {
      return NextResponse.json({
        verified: false,
        action: "failed_payment",
        reply: `❌ *Payment ${extracted.status} hai!*\n\nBhai, aapka payment *${extracted.status}* dikh raha hai.\n\nSuccessful payment hone ke baad screenshot bhejo. 🙏`,
      });
    }

    // ─── Step 5: Check recipient name against approved names ─────────────────
    const approvedNames: string[] = settings.ai.paymentRecipientNames || [];
    const recipientFromScreenshot = (extracted.recipientName || "").toLowerCase().trim();

    let recipientMatched = false;
    let matchedName = "";

    if (approvedNames.length > 0 && recipientFromScreenshot) {
      for (const name of approvedNames) {
        if (
          recipientFromScreenshot.includes(name.toLowerCase().trim()) ||
          name.toLowerCase().trim().includes(recipientFromScreenshot)
        ) {
          recipientMatched = true;
          matchedName = name;
          break;
        }
      }
    } else if (approvedNames.length === 0) {
      // No approved names configured → skip recipient check
      recipientMatched = true;
    }

    if (!recipientMatched) {
      await PaymentRecord.create({
        user: user._id,
        contactPhone,
        contactName: contactName || "",
        transactionId: extracted.transactionId,
        amount: extracted.amount || 0,
        paymentMethod: extracted.paymentMethod || "",
        recipientName: extracted.recipientName || "",
        paymentDate: `${extracted.paymentDate || ""} ${extracted.paymentTime || ""}`.trim(),
        status: "wrong_recipient",
        rawExtractedData: JSON.stringify(extracted),
      });

      return NextResponse.json({
        verified: false,
        action: "wrong_recipient",
        reply: `❌ *Payment galat jagah gayi hai!*\n\n*Recipient:* ${extracted.recipientName || "Unknown"}\n*Amount:* ₹${extracted.amount || "?"}\n*Transaction ID:* ${extracted.transactionId}\n\nHumara payment sirf *approved accounts* par aana chahiye.\n\n📞 Help ke liye support se contact karo.`,
      });
    }

    // ─── Step 6: Duplicate Transaction ID check (Global check across all users)
    const existingRecord = await PaymentRecord.findOne({
      transactionId: extracted.transactionId,
    });

    if (existingRecord) {
      let origDateStr = "kuch samay pehle";
      let origTimeStr = "";
      try {
        const origDate = existingRecord.createdAt ? new Date(existingRecord.createdAt) : null;
        if (origDate && !isNaN(origDate.getTime())) {
          origDateStr = origDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
          origTimeStr = " ko " + origDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
        }
      } catch (e) {
        console.error("Error formatting duplicate date:", e);
      }

      return NextResponse.json({
        verified: false,
        action: "duplicate",
        reply: `⚠️ *Yeh screenshot already submit ho chuka hai!*\n\n*Transaction ID:* ${extracted.transactionId}\n*Pehle submit hua:* ${origDateStr}${origTimeStr}\n\nPlease check karo — yeh payment already add ho chuki hai.\n\nKoi aur issue ho toh support se contact karo. 😊`,
      });
    }

    // ─── Step 7: All checks passed — Save and return success ──────────────────
    const paymentDateStr = `${extracted.paymentDate || ""} ${extracted.paymentTime || ""}`.trim();
    const submittedAt = new Date();
    const submittedDateStr = submittedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
    const submittedTimeStr = submittedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

    await PaymentRecord.create({
      user: user._id,
      contactPhone,          // WhatsApp number — stored for admin view
      contactName: contactName || "",
      transactionId: extracted.transactionId,
      amount: extracted.amount || 0,
      paymentMethod: extracted.paymentMethod || "",
      recipientName: extracted.recipientName || "",
      paymentDate: paymentDateStr,
      status: "verified",
      rawExtractedData: JSON.stringify(extracted),
    });

    return NextResponse.json({
      verified: true,
      action: "verified",
      extractedData: {
        transactionId: extracted.transactionId,
        amount: extracted.amount,
        recipientName: extracted.recipientName,
        paymentMethod: extracted.paymentMethod,
        paymentDate: extracted.paymentDate,
        paymentTime: extracted.paymentTime,
        contactPhone,
      },
      reply: `✅ *Payment Verified!*\n\n💰 *Amount:* ₹${extracted.amount}\n📱 *Method:* ${extracted.paymentMethod || "UPI"}\n👤 *Recipient:* ${extracted.recipientName}\n🔢 *Transaction ID:* ${extracted.transactionId}\n📅 *Payment Date:* ${paymentDateStr || "—"}\n⏰ *Submitted:* ${submittedDateStr} ${submittedTimeStr}\n\n✅ Aapki payment record ho gayi hai. Points jald add kar diye jayenge! 😊`
    });
  } catch (error) {
    console.error("Payment screenshot error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


// GET /api/payment/screenshot — Get payment records (dashboard via session)
export async function GET(req: NextRequest) {
  try {
    const { auth } = await import("@/lib/auth/auth");
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const skip = (page - 1) * limit;

    const query: any = { user: session.user.id };
    if (status) query.status = status;

    const records = await PaymentRecord.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await PaymentRecord.countDocuments(query);

    return NextResponse.json({ records, total, page, limit });
  } catch (error) {
    console.error("Get payment records error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

