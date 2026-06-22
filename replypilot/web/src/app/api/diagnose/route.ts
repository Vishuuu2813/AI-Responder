import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import { SystemSettings } from "@/models/SystemSettings";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: any = {
    step: "start",
    dbConnected: false,
    systemSettingsFound: false,
    apiKeyLength: 0,
    openaiCallSuccess: false,
    error: null,
    stack: null,
    rawResponseBody: null,
  };

  try {
    // 1. Connect DB
    result.step = "connect_db";
    await connectDB();
    result.dbConnected = true;

    // 2. Query SystemSettings
    result.step = "query_system_settings";
    const sysSettings = await SystemSettings.findOne();
    result.systemSettingsFound = !!sysSettings;

    const apiKey = sysSettings?.systemApiKey || process.env.OPENAI_API_KEY;
    result.apiKeyLength = apiKey ? apiKey.length : 0;
    result.apiKeyPrefix = apiKey ? apiKey.substring(0, 10) : "";

    if (!apiKey) {
      throw new Error("No API key found in SystemSettings or process.env");
    }

    // 3. Call OpenAI
    result.step = "call_openai";
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
    });

    result.openaiCallSuccess = true;
    result.openaiResponse = completion.choices[0]?.message?.content || "";
    result.step = "completed";

  } catch (err: any) {
    result.error = err?.message || String(err);
    result.stack = err?.stack || null;
    
    // Check if error contains response data (e.g. from fetch response)
    if (err?.response) {
      try {
        result.rawResponseBody = await err.response.text();
      } catch (textErr) {
        result.rawResponseBody = "Failed to extract text from response: " + String(textErr);
      }
    }
  }

  return NextResponse.json(result);
}
